document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. 設定データ ----
    const pricingData = {
        "スインクホール": {
            baseAm: 12030, basePm: 16050, baseNight: 17550, baseAllday: 38790,
            alldayAm: 10220, alldayPm: 13640, alldayNight: 14930,
            extHour: 5030,
            hasHvac: true, coolerRate: 1900, heaterRate: 2540,
            specificEq: [
                { name: "演台", price: 360, max: 1 },
                { name: "音響設備", price: 1680, max: 1 },
                { name: "照明設備", price: 1600, max: 1 },
                { name: "映像設備", price: 8800, max: 1 }
            ]
        },
        "セミナー室": {
            baseAm: 4310, basePm: 5750, baseNight: 6290, baseAllday: 13910,
            alldayAm: 3660, alldayPm: 4890, alldayNight: 5360,
            extHour: 1800,
            hasHvac: true, coolerRate: 600, heaterRate: 810,
            specificEq: [
                { name: "演台", price: 360, max: 1 },
                { name: "音響設備", price: 540, max: 1 },
                { name: "映像設備", price: 2140, max: 1 }
            ]
        },
        "研修室": {
            baseAm: 1730, basePm: 2300, baseNight: 2520, baseAllday: 5560, 
            alldayAm: 1470, alldayPm: 1950, alldayNight: 2140,
            extHour: 720,
            hasHvac: false,
            specificEq: []
        },
        "多目的研修室": {
            baseAm: 4120, basePm: 5510, baseNight: 6020, baseAllday: 13320,
            alldayAm: 3510, alldayPm: 4680, alldayNight: 5130,
            extHour: 1720,
            hasHvac: false,
            specificEq: []
        },
        "会議室１": {
            baseAm: 850, basePm: 1150, baseNight: 1250, baseAllday: 2780,
            alldayAm: 730, alldayPm: 980, alldayNight: 1070,
            extHour: 350,
            hasHvac: false,
            specificEq: []
        },
        "会議室２": {
            baseAm: 850, basePm: 1150, baseNight: 1250, baseAllday: 2780,
            alldayAm: 730, alldayPm: 980, alldayNight: 1070,
            extHour: 350,
            hasHvac: false,
            specificEq: []
        },
        "会議室３": {
            baseAm: 2490, basePm: 3320, baseNight: 3630, baseAllday: 8040,
            alldayAm: 2120, alldayPm: 2820, alldayNight: 3100,
            extHour: 1030,
            hasHvac: false,
            specificEq: []
        },
        "会議室４": {
            baseAm: 3800, basePm: 5070, baseNight: 5540, baseAllday: 12250,
            alldayAm: 3230, alldayPm: 4310, alldayNight: 4710,
            extHour: 1590,
            hasHvac: false,
            specificEq: []
        },
        "創作コーナー": {
            isHourly: true,
            adultRate: 230,
            childRate: 110,
            specificEq: [
                { name: "持込器具電源", price: 100, max: 99 }
            ]
        }
    };

    const commonEq = [
        { name: "演台", price: 360, max: 2 },
        { name: "司会者台", price: 0, max: 2 },
        { name: "視聴覚装置", price: 1500, max: 2 },
        { name: "持込器具電源", price: 100, max: 99 },
        { name: "ノートパソコン (Office付)", price: 520, max: 4 },
        { name: "ノートパソコン (Office無)", price: 520, max: 10 },
        { name: "ノートパソコン (タブレット)", price: 520, max: 14 },
        { name: "インクジェットプリンター", price: 100, max: 2 },
        { name: "液晶プロジェクター", price: 1100, max: 2 }
    ];

    const timeRanges = {
        "早朝延長": { start: "08:30", end: "09:00" },
        "午前": { start: "09:00", end: "12:00" },
        "昼間延長": { start: "12:00", end: "13:00" },
        "午後": { start: "13:00", end: "17:00" },
        "夕方延長": { start: "17:00", end: "18:00" },
        "夜間": { start: "18:00", end: "21:30" },
        "全日": { start: "09:00", end: "21:30" }
    };

    let selectedRooms = [];
    let roomConfigs = {};
    let activeRoom = null;

    // ---- 2. ユーティリティ ----
    function initRoomConfig(roomName) {
        if (roomConfigs[roomName]) return;
        const data = pricingData[roomName];
        roomConfigs[roomName] = {
            timeSegments: data.isHourly ? [] : ["午前"],
            extHours: { "早朝延長": 0, "昼間延長": 0, "夕方延長": 0 },
            creationHours: { adult: 0, child: 0 },
            admissionFee: 0,
            admissionMult: 1.0,
            hvac: { cooler: 0, heater: 0 },
            equipment: {},
            performanceTime: { start: "09:00", end: "21:30" }
        };
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function isOverlap(range1, range2) {
        const start1 = timeToMinutes(range1.start);
        const end1 = timeToMinutes(range1.end);
        const start2 = timeToMinutes(range2.start);
        const end2 = timeToMinutes(range2.end);
        return start1 < end2 && start2 < end1;
    }

    function truncateTo10(val) {
        return Math.floor(Math.round(val) / 10) * 10;
    }

    function calculateAdmissionMult(fee) {
        if (fee <= 0) return 1.0;
        if (fee >= 3000) return 2.0;
        if (fee >= 1000) return 1.5;
        return 1.3;
    }

    // ---- 3. UI部品生成 ----
    function renderStepper(value, min, max, dataAttrs = '', extraClass = '') {
        const isMax = max !== null && value >= max;
        const isMin = value <= min;
        return `
            <div class="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shooter-stepper p-1">
                <button type="button" class="stepper-btn stepper-minus size-8 sm:size-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 disabled:opacity-20 flex items-center justify-center transition-all" 
                        ${isMin ? 'disabled' : ''} ${dataAttrs} data-action="minus">
                    <span class="font-bold text-lg">－</span>
                </button>
                <input type="number" class="stepper-input ${extraClass} w-10 border-0 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white focus:ring-0 p-0" 
                       value="${value}" min="${min}" ${max !== null ? `max="${max}"` : ''} ${dataAttrs} readonly />
                <button type="button" class="stepper-btn stepper-plus size-8 sm:size-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 disabled:opacity-20 flex items-center justify-center transition-all" 
                        ${isMax ? 'disabled' : ''} ${dataAttrs} data-action="plus">
                    <span class="font-bold text-lg">＋</span>
                </button>
            </div>
        `;
    }

    function renderNormalTimeUI(roomName, config) {
        const segments = [
            { id: '午前', range: ' (9:00 - 12:00)' },
            { id: '午後', range: ' (13:00 - 17:00)' },
            { id: '夜間', range: ' (18:00 - 21:30)' },
            { id: '全日', range: ' (9:00 - 21:30)' }
        ];

        const isAm = config.timeSegments.includes('午前') || config.timeSegments.includes('全日');
        const isPm = config.timeSegments.includes('午後') || config.timeSegments.includes('全日');
        const isNt = config.timeSegments.includes('夜間') || config.timeSegments.includes('全日');

        return `
            <div class="space-y-6">
                <div>
                    <label class="text-xs font-bold text-slate-400 block mb-4">利用区分（複数選択可）</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${segments.map(seg => {
                            const selected = config.timeSegments.includes(seg.id);
                            return `
                                <label class="time-label group flex cursor-pointer items-center gap-3 rounded-2xl border-2 ${selected ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} px-4 py-4 text-sm font-bold transition-all">
                                    <input class="hidden time-checkbox" type="checkbox" value="${seg.id}" data-room="${roomName}" ${selected ? 'checked' : ''} />
                                    <span class="flex-1">${selected ? '●' : '○'} ${seg.id}<span class="text-[11px] font-medium opacity-60">${seg.range}</span></span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-100 dark:border-slate-800">
                    <p class="text-[11px] font-bold text-slate-400 mb-4 flex items-center gap-2">
                        【延長】 延長時間の予約設定
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div class="flex flex-col gap-2">
                            <label class="text-[11px] font-bold text-slate-500">早朝 (8:30～9:00)</label>
                            ${!isAm ? `<div class="h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 text-[10px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">午前 予約時のみ</div>` : `
                                <select class="room-ext-select w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold p-3 appearance-none transition-all focus:ring-primary h-12" data-room="${roomName}" data-ext="早朝延長">
                                    <option value="0" ${config.extHours["早朝延長"] === 0 ? 'selected' : ''}>利用しない</option>
                                    <option value="1" ${config.extHours["早朝延長"] === 1 ? 'selected' : ''}>利用する (0.5時間)</option>
                                </select>`}
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-[11px] font-bold text-slate-500">昼間 (12:00～13:00)</label>
                            ${(isAm && isPm) ? `<div class="h-12 flex items-center justify-center bg-primary/5 text-primary text-[10px] font-bold rounded-xl border border-primary/10">連続利用で自動適用</div>` : !(isAm || isPm) ? `<div class="h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 text-[10px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">午前/午後 予約時のみ</div>` : `
                                <select class="room-ext-select w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold p-3 appearance-none transition-all focus:ring-primary h-12" data-room="${roomName}" data-ext="昼間延長">
                                    <option value="0" ${config.extHours["昼間延長"] === 0 ? 'selected' : ''}>利用しない</option>
                                    <option value="1" ${config.extHours["昼間延長"] === 1 ? 'selected' : ''}>利用する (1.0時間)</option>
                                </select>`}
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-[11px] font-bold text-slate-500">夕方 (17:00～18:00)</label>
                            ${(isPm && isNt) ? `<div class="h-12 flex items-center justify-center bg-primary/5 text-primary text-[10px] font-bold rounded-xl border border-primary/10">連続利用で自動適用</div>` : !(isPm || isNt) ? `<div class="h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 text-[10px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">午後/夜間 予約時のみ</div>` : `
                                <select class="room-ext-select w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold p-3 appearance-none transition-all focus:ring-primary h-12" data-room="${roomName}" data-ext="夕方延長">
                                    <option value="0" ${config.extHours["夕方延長"] === 0 ? 'selected' : ''}>利用しない</option>
                                    <option value="1" ${config.extHours["夕方延長"] === 1 ? 'selected' : ''}>利用する (1.0時間)</option>
                                </select>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderHourlyTimeUI(roomName, config) {
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <label class="text-[11px] font-bold text-slate-400 block mb-4">一般利用 (¥230/時間)</label>
                    <div class="flex items-center gap-4">
                        ${renderStepper(config.creationHours.adult, 0, null, `data-room="${roomName}" data-type="adult"`, 'room-creation-input')}
                        <span class="text-sm font-bold">時間</span>
                    </div>
                </div>
                <div class="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <label class="text-[11px] font-bold text-slate-400 block mb-4">小・中学生利用 (¥110/時間)</label>
                    <div class="flex items-center gap-4">
                        ${renderStepper(config.creationHours.child, 0, null, `data-room="${roomName}" data-type="child"`, 'room-creation-input')}
                        <span class="text-sm font-bold">時間</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAdmissionUI(roomName, config) {
        return `
            <div class="space-y-6">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-slate-400 mb-2">最高入場料の単価（円）</label>
                    <div class="relative">
                        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">¥</div>
                        <input type="number" class="room-admission-fee-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right pr-12 pl-12 font-bold focus:ring-primary focus:border-primary transition-all h-12" data-room="${roomName}" min="0" value="${config.admissionFee || 0}" />
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">円</span>
                    </div>
                </div>
                <div class="rounded-2xl bg-primary/5 dark:bg-primary/10 p-5 border border-primary/10 flex items-center justify-between">
                    <span class="text-xs font-bold text-primary">適用される割増率</span>
                    <span id="adm-mult-val" class="text-xl font-black text-primary">${config.admissionMult.toFixed(1)} <span class="text-xs">倍</span></span>
                </div>
            </div>
        `;
    }

    function renderHvacUI(roomName, config, data) {
        return `
            <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
                    <label class="flex items-center gap-2 text-[11px] font-bold text-slate-400 mb-4">
                        冷房
                    </label>
                    <div class="flex items-center gap-3">
                        ${renderStepper(config.hvac.cooler, 0, null, `data-room="${roomName}" data-type="cooler"`, 'room-hvac-input')}
                        <span class="text-[10px] text-slate-400 font-bold">¥${data.coolerRate}/時</span>
                    </div>
                </div>
                <div class="flex flex-col p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
                    <label class="flex items-center gap-2 text-[11px] font-bold text-slate-400 mb-4">
                         暖房
                    </label>
                    <div class="flex items-center gap-3">
                        ${renderStepper(config.hvac.heater, 0, null, `data-room="${roomName}" data-type="heater"`, 'room-hvac-input')}
                        <span class="text-[10px] text-slate-400 font-bold">¥${data.heaterRate}/時</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderEquipmentUI(roomName, config, data) {
        let eqs = data.isHourly ? [...(data.specificEq || [])] : [...(data.specificEq || []), ...commonEq.filter(ce => !(data.specificEq || []).some(se => se.name === ce.name))];
        if (roomName === "スインクホール" || roomName === "セミナー室") eqs = eqs.filter(e => e.name !== "司会者台");

        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${eqs.map(eq => `
                    <div class="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all relative">
                        <div class="flex flex-col mb-4 pr-10">
                            <span class="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap overflow-hidden text-overflow-ellipsis">${eq.name}</span>
                            <span class="text-[10px] text-primary font-bold">¥${eq.price.toLocaleString()} <span class="text-slate-400 font-medium">/ 1区分につき (最大${eq.max})</span></span>
                        </div>
                        <div class="space-y-4">
                            ${['午前', '午後', '夜間'].map(seg => `
                                <div class="flex items-center justify-between gap-4 py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                    <span class="text-[11px] font-bold text-slate-500">${seg}</span>
                                    ${renderStepper(config.equipment[eq.name + '_' + seg] || 0, 0, eq.max, `data-room="${roomName}" data-name="${eq.name}" data-seg="${seg}"`, 'room-eq-input')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderTimeline(roomName) {
        const config = roomConfigs[roomName];
        if (!config || pricingData[roomName].isHourly) return '';
        const startT = timeToMinutes("09:00"), endT = timeToMinutes("21:30"), totalD = endT - startT;
        const getP = (t) => Math.max(0, Math.min(100, ((timeToMinutes(t) - startT) / totalD) * 100));

        const segs = [
            { id: '午前', color: 'bg-blue-300/30' },
            { id: '午後', color: 'bg-emerald-300/30' },
            { id: '夜間', color: 'bg-purple-300/30' }
        ];

        return `
            <div class="relative w-full pt-8 pb-4 min-w-0">
                <div class="absolute top-0 left-0 right-0 flex justify-between px-1 text-[9px] font-bold text-slate-300 uppercase">
                    <span>9:00</span><span>12:00</span><span>17:00</span><span>21:30</span>
                </div>
                <div class="relative w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex border border-slate-200 dark:border-slate-700">
                    ${segs.map(s => {
                        const range = timeRanges[s.id];
                        const sel = config.timeSegments.includes(s.id) || config.timeSegments.includes('全日');
                        const left = getP(range.start), width = getP(range.end) - left;
                        return `<div class="absolute top-0 bottom-0 ${sel ? s.color : 'bg-transparent'} transition-colors border-x border-slate-200/20" style="left: ${left}%; width: ${width}%;"></div>`;
                    }).join('')}
                    <div class="absolute top-1 bottom-1 bg-primary rounded-full z-10 transition-all opacity-90 shadow-[0_0_10px_rgba(30,64,175,0.4)]" style="left: ${getP(config.performanceTime.start)}%; width: ${Math.max(2, getP(config.performanceTime.end) - getP(config.performanceTime.start))}%;"></div>
                </div>
                <div class="mt-4 flex flex-wrap justify-center gap-4 text-[9px] font-bold text-slate-400">
                    <div class="flex items-center gap-1.5"><div class="w-3 h-1.5 bg-primary rounded-full"></div>本番時間</div>
                    <div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-blue-300/30 border border-blue-200/50 rounded-[2px]"></div>予約済区分</div>
                </div>
            </div>
        `;
    }

    function renderRoomConfigs() {
        const container = document.getElementById('room-configs-container');
        if (selectedRooms.length === 0) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-300"><p class="text-sm font-bold text-slate-400">施設を選択すると設定が表示されます</p></div>`;
            return;
        }
        if (!activeRoom || !selectedRooms.includes(activeRoom)) activeRoom = selectedRooms[0];

        const tabsHtml = `<div class="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">${selectedRooms.map(r => `<button class="room-tab whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black transition-all ${r === activeRoom ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'}" data-room="${r}">${r}</button>`).join('')}</div>`;
        const data = pricingData[activeRoom], config = roomConfigs[activeRoom];

        const configHtml = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="flex items-center justify-between mb-10 pb-6 border-b border-slate-50 dark:border-slate-800">
                    <h2 class="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white">${activeRoom} の設定</h2>
                    <button class="remove-room-btn text-xs font-bold text-red-400 hover:text-red-500 flex items-center gap-1" data-room="${activeRoom}">× 予約を解除</button>
                </div>
                <div class="space-y-12">
                    <section><h3 class="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">1. 利用時間の指定</h3>${data.isHourly ? renderHourlyTimeUI(activeRoom, config) : renderNormalTimeUI(activeRoom, config)}</section>
                    <section><h3 class="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">2. 入場料等による加算設定</h3>${activeRoom === '創作コーナー' ? `<div class="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs font-bold text-slate-400 border border-dashed border-slate-200">この施設では入場料割増は適用されません。</div>` : renderAdmissionUI(activeRoom, config)}</section>
                    <section class="bg-primary/[0.03] dark:bg-primary/[0.05] p-6 sm:p-8 rounded-[2rem] border border-primary/10 shadow-inner">
                        <h3 class="flex items-center gap-2 text-[11px] font-black text-primary mb-4 uppercase tracking-wider">割増判定用の「本番時間」</h3>
                        <p class="text-[10px] text-slate-500 mb-6 font-bold">※本番時間と重なる区分・延長時間にのみ割増が適用されます。</p>
                        ${renderTimeline(activeRoom)}
                        <div class="flex items-center gap-4 mt-8">
                            <div class="flex-1"><label class="text-[9px] font-bold text-slate-400 mb-1.5 block">本番 開始</label><input type="time" class="performance-time-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold p-3 focus:ring-primary" data-room="${activeRoom}" data-type="start" value="${config.performanceTime.start}"></div>
                            <span class="mt-5 text-slate-300 font-light">～</span>
                            <div class="flex-1"><label class="text-[9px] font-bold text-slate-400 mb-1.5 block">本番 終了</label><input type="time" class="performance-time-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold p-3 focus:ring-primary" data-room="${activeRoom}" data-type="end" value="${config.performanceTime.end}"></div>
                        </div>
                    </section>
                    ${data.hasHvac ? `<section><h3 class="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">3. 冷暖房の使用時間</h3>${renderHvacUI(activeRoom, config, data)}</section>` : ''}
                    <section><h3 class="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">${data.hasHvac ? '4' : '3'}. 附属設備・備品</h3>${renderEquipmentUI(activeRoom, config, data)}</section>
                </div>
            </div>
        `;
        container.innerHTML = tabsHtml + configHtml;
        attachEvents();
    }

    // ---- 4. イベント・計算 ----
    function attachEvents() {
        document.querySelectorAll('.room-tab').forEach(t => t.onclick = () => { activeRoom = t.dataset.room; renderRoomConfigs(); });
        document.querySelectorAll('.remove-room-btn').forEach(b => b.onclick = () => { const r = b.dataset.room; selectedRooms = selectedRooms.filter(x => x !== r); delete roomConfigs[r]; updateButtons(); renderRoomConfigs(); calculateTotal(); });
        document.querySelectorAll('.time-checkbox').forEach(c => c.onchange = () => {
            const r = c.dataset.room, v = c.value, cfg = roomConfigs[r];
            if (v === '全日') cfg.timeSegments = c.checked ? ['全日'] : [];
            else { if (c.checked) { cfg.timeSegments = cfg.timeSegments.filter(x => x !== '全日'); cfg.timeSegments.push(v); } else { cfg.timeSegments = cfg.timeSegments.filter(x => x !== v); } }
            renderRoomConfigs(); calculateTotal();
        });
        document.querySelectorAll('.room-ext-select').forEach(s => s.onchange = () => { roomConfigs[s.dataset.room].extHours[s.dataset.ext] = Number(s.value); calculateTotal(); });
        document.querySelectorAll('.room-creation-input').forEach(i => i.oninput = () => { roomConfigs[i.dataset.room].creationHours[i.dataset.type] = Number(i.value) || 0; calculateTotal(); });
        document.querySelectorAll('.room-admission-fee-input').forEach(i => i.oninput = () => {
            const r = i.dataset.room, f = Number(i.value) || 0;
            roomConfigs[r].admissionFee = f;
            roomConfigs[r].admissionMult = calculateAdmissionMult(f);
            document.getElementById('adm-mult-val').textContent = roomConfigs[r].admissionMult.toFixed(1) + ' 倍';
            calculateTotal();
        });
        document.querySelectorAll('.room-hvac-input').forEach(i => i.oninput = () => { roomConfigs[i.dataset.room].hvac[i.dataset.type] = Number(i.value) || 0; calculateTotal(); });
        document.querySelectorAll('.room-eq-input').forEach(i => i.oninput = () => { roomConfigs[i.dataset.room].equipment[i.dataset.name + '_' + i.dataset.seg] = Number(i.value) || 0; calculateTotal(); });
        document.querySelectorAll('.performance-time-input').forEach(i => i.oninput = () => { roomConfigs[i.dataset.room].performanceTime[i.dataset.type] = i.value; renderRoomConfigs(); calculateTotal(); });
        document.querySelectorAll('.stepper-btn').forEach(b => b.onclick = () => {
            const act = b.dataset.action, ct = b.closest('.shooter-stepper'), inp = ct.querySelector('.stepper-input');
            let v = Number(inp.value), min = Number(inp.min), max = inp.max ? Number(inp.max) : null;
            if (act === 'plus' && (max === null || v < max)) v++; else if (act === 'minus' && v > min) v--;
            inp.value = v; 
            
            // ボタンの有効・無効状態を即時更新
            const minusBtn = ct.querySelector('.stepper-minus');
            const plusBtn = ct.querySelector('.stepper-plus');
            if (minusBtn) minusBtn.disabled = (v <= min);
            if (plusBtn) plusBtn.disabled = (max !== null && v >= max);
            
            inp.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    function calculateTotal() {
        let totalAll = 0, detailsHtml = '', summary = '【大垣市情報工房 料金見積】\n\n';
        selectedRooms.forEach(rn => {
            const d = pricingData[rn], c = roomConfigs[rn];
            let roomTotal = 0, details = [];
            summary += `■ ${rn}\n`;

            if (d.isHourly) {
                const adultRes = c.creationHours.adult * d.adultRate, childRes = c.creationHours.child * d.childRate;
                roomTotal = adultRes + childRes;
                if (c.creationHours.adult > 0) { details.push(`一般: ${c.creationHours.adult}時間 (¥${adultRes.toLocaleString()})`); summary += ` ・一般: ${c.creationHours.adult}時間 ¥${adultRes.toLocaleString()}\n`; }
                if (c.creationHours.child > 0) { details.push(`小中学生: ${c.creationHours.child}時間 (¥${childRes.toLocaleString()})`); summary += ` ・小中学生: ${c.creationHours.child}時間 ¥${childRes.toLocaleString()}\n`; }
            } else {
                let baseT = 0; const isFull = c.timeSegments.includes('全日') || (c.timeSegments.includes('午前') && c.timeSegments.includes('午後') && c.timeSegments.includes('夜間'));
                const segKeys = ['午前', '午後', '夜間'];
                segKeys.forEach(sk => {
                    if (c.timeSegments.includes(sk) || isFull) {
                        const fee = isFull ? d['allday' + (sk==='午前'?'Am':sk==='午後'?'Pm':'Night')] : d['base' + (sk==='午前'?'Am':sk==='午後'?'Pm':'Night')];
                        const overlap = isOverlap(c.performanceTime, timeRanges[sk]);
                        const final = overlap ? truncateTo10(fee * c.admissionMult) : fee;
                        baseT += final;
                        details.push(`${sk}: ¥${final.toLocaleString()}${overlap && c.admissionMult > 1 ? ` (割増済)` : ''}`);
                        summary += ` ・${sk}: ¥${final.toLocaleString()}\n`;
                    }
                });
                let extT = 0;
                ["早朝延長", "昼間延長", "夕方延長"].forEach(ek => {
                    let h = c.extHours[ek];
                    if (ek === "昼間延長" && ((c.timeSegments.includes('午前') && c.timeSegments.includes('午後')) || isFull)) h = 1;
                    if (ek === "夕方延長" && ((c.timeSegments.includes('午後') && c.timeSegments.includes('夜間')) || isFull)) h = 1;
                    if (h > 0) {
                        const isAuto = (ek === "昼間延長" && ((c.timeSegments.includes('午前') && c.timeSegments.includes('午後')) || isFull)) || (ek === "夕方延長" && ((c.timeSegments.includes('午後') && c.timeSegments.includes('夜間')) || isFull));
                        const raw = d.extHour;
                        const final = (!isAuto && isOverlap(c.performanceTime, timeRanges[ek])) ? truncateTo10(raw * c.admissionMult) : raw;
                        extT += isAuto ? 0 : final;
                        if (!isAuto) { 
                            details.push(`${ek}: ¥${final.toLocaleString()}${!isAuto && isOverlap(c.performanceTime, timeRanges[ek]) && c.admissionMult > 1 ? ` (割増済)` : ''}`); 
                            summary += ` ・${ek}: ¥${final.toLocaleString()}\n`;
                        }
                    }
                });
                roomTotal = baseT + extT;
            }

            if (d.hasHvac) {
                const ct = c.hvac.cooler * d.coolerRate, ht = c.hvac.heater * d.heaterRate;
                if (ct > 0) { roomTotal += ct; details.push(`冷房 ${c.hvac.cooler}時間 (¥${ct.toLocaleString()})`); summary += ` ・冷房費: ¥${ct.toLocaleString()}\n`; }
                if (ht > 0) { roomTotal += ht; details.push(`暖房 ${c.hvac.heater}時間 (¥${ht.toLocaleString()})`); summary += ` ・暖房費: ¥${ht.toLocaleString()}\n`; }
            }
            let eqTotal = 0;
            for (let k in c.equipment) {
                if (c.equipment[k] > 0) {
                    const [nm, sg] = k.split('_');
                    const spec = (d.specificEq || []).find(e => e.name === nm);
                    const price = spec ? spec.price : (commonEq.find(e => e.name === nm)?.price || 0);
                    const subT = price * c.equipment[k];
                    eqTotal += subT;
                    details.push(`${nm}(${sg}): ¥${subT.toLocaleString()}`);
                    summary += ` ・${nm}(${sg}): ¥${subT.toLocaleString()}\n`;
                }
            }
            if (eqTotal > 0) { roomTotal += eqTotal; }
            
            summary += ` [小計: ¥${roomTotal.toLocaleString()}]\n\n`;
            if (roomTotal > 0) {
                totalAll += roomTotal;
                detailsHtml += `<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"><div class="flex justify-between font-black mb-2 text-slate-800 dark:text-white"><span>${rn}</span><span>¥${roomTotal.toLocaleString()}</span></div><div class="text-[10px] space-y-1 text-slate-500 font-bold">${details.map(dl => `<div>・ ${dl}</div>`).join('')}</div></div>`;
            }
        });

        summary += `---\n合計: ¥${totalAll.toLocaleString()}\n※概算値です。`;
        document.getElementById('sim-room-name').textContent = selectedRooms.length > 0 ? selectedRooms.join(', ') : '未選択';
        document.getElementById('sim-details-list').innerHTML = detailsHtml || '<div class="py-10 text-center opacity-30 font-bold">施設が選択されていません</div>';
        document.getElementById('sim-total-price').textContent = `¥${totalAll.toLocaleString()}`;
        document.getElementById('mobile-total-price').textContent = `¥${totalAll.toLocaleString()}`;
        const bar = document.getElementById('mobile-total-bar');
        if (totalAll > 0) bar.classList.remove('translate-y-24'); else bar.classList.add('translate-y-24');

        const copyBtn = document.getElementById('copy-estimate-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(summary).then(() => {
                    const oldHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = '● コピーしました！';
                    copyBtn.classList.replace('bg-primary', 'bg-emerald-600');
                    setTimeout(() => { copyBtn.innerHTML = oldHtml; copyBtn.classList.replace('bg-emerald-600', 'bg-primary'); }, 2000);
                });
            };
        }
    }

    function updateButtons() {
        const btns = document.querySelectorAll('.sim-room-btn');
        btns.forEach(b => {
            const r = b.dataset.room;
            if (selectedRooms.includes(r)) {
                b.classList.add('border-primary', 'bg-primary/5', 'ring-4', 'ring-primary/10');
            } else {
                b.classList.remove('border-primary', 'bg-primary/5', 'ring-4', 'ring-primary/10');
            }
        });
    }

    const roomBtns = document.querySelectorAll('.sim-room-btn');
    roomBtns.forEach(btn => btn.onclick = () => {
        const r = btn.dataset.room;
        if (selectedRooms.includes(r)) {
            selectedRooms = selectedRooms.filter(x => x !== r);
            delete roomConfigs[r];
        } else {
            selectedRooms.push(r);
            initRoomConfig(r);
            activeRoom = r;
        }
        updateButtons();
        renderRoomConfigs();
        calculateTotal();
    });

    const resetBtn = document.getElementById('reset-inputs-btn');
    if (resetBtn) resetBtn.onclick = () => { if (confirm('入力をすべてクリアしますか？')) { selectedRooms = []; roomConfigs = {}; activeRoom = null; updateButtons(); renderRoomConfigs(); calculateTotal(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

    document.getElementById('mobile-scroll-to-result')?.addEventListener('click', () => {
        const pan = document.querySelector('.lg\\:w-96');
        if (pan) pan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    renderRoomConfigs();
    calculateTotal();
});
