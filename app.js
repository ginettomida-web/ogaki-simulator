document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Navigation Logic (Simulator only) ----
    const navBtns = document.querySelectorAll('.nav-btn');
    // Navigation is disabled as only one view exists now

    // ---- 2. Pricing Data Structure ----
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
        { name: "司会者台 (ワイヤレスマイク2本付き)", price: 0, max: 2 },
        { name: "視聴覚装置", price: 1500, max: 2 },
        { name: "持込器具電源", price: 100, max: 99 },
        { name: "ノート型パソコン (Officeあり)", price: 520, max: 4 },
        { name: "ノート型パソコン (Officeなし)", price: 520, max: 10 },
        { name: "ノート型パソコン（タブレット型）", price: 520, max: 14 },
        { name: "Ａ４インクジェットプリンター", price: 100, max: 2 },
        { name: "液晶プロジェクター", price: 1100, max: 2 }
    ];

    let selectedRooms = [];
    let roomConfigs = {};
    let activeRoom = null;

    function initRoomConfig(roomName) {
        if (roomConfigs[roomName]) return;
        const data = pricingData[roomName];
        roomConfigs[roomName] = {
            timeSegments: data.isHourly ? [] : ["am"],
            extHours: { "早朝延長": 0, "昼間延長": 0, "夕方延長": 0 },
            creationHours: { adult: 0, child: 0 },
            admissionFee: 0,
            admissionMult: 1.0,
            hvac: { cooler: 0, heater: 0 },
            equipment: {}, // { name_segment: qty }
            overrides: {},  // { fieldName: value }
            performanceTime: { start: "09:00", end: "21:30" }
        };
    }

    function calculateAdmissionMult(fee) {
        if (fee <= 0) return 1.0;
        if (fee < 1000) return 1.3;
        if (fee <= 3000) return 1.5;
        return 2.0;
    }

    const timeRanges = {
        "早朝延長": { start: "08:30", end: "09:00" },
        "am": { start: "09:00", end: "12:00" },
        "昼間延長": { start: "12:00", end: "13:00" },
        "pm": { start: "13:00", end: "17:00" },
        "夕方延長": { start: "17:00", end: "18:00" },
        "night": { start: "18:00", end: "21:30" },
        "allday": { start: "09:00", end: "21:30" }
    };

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function generateTimeOptions(selectedTime) {
        let options = '';
        for (let h = 8; h <= 21; h++) {
            for (let m = 0; m <= 30; m += 30) {
                if (h === 8 && m === 0) continue; // Start from 08:30
                if (h === 21 && m === 30) {
                    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    options += `<option value="${time}" ${selectedTime === time ? 'selected' : ''}>${time}</option>`;
                    break;
                }
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                options += `<option value="${time}" ${selectedTime === time ? 'selected' : ''}>${time}</option>`;
            }
        }
        return options;
    }

    function isOverlap(range1, range2) {
        const start1 = timeToMinutes(range1.start);
        const end1 = timeToMinutes(range1.end);
        const start2 = timeToMinutes(range2.start);
        const end2 = timeToMinutes(range2.end);
        return start1 < end2 && start2 < end1;
    }
    
    function getPrice(roomName, fieldName, defaultValue) {
        const config = roomConfigs[roomName];
        if (config && config.overrides && config.overrides[fieldName] !== undefined) {
            return config.overrides[fieldName];
        }
        return defaultValue;
    }

    const roomBtns = document.querySelectorAll('.sim-room-btn');
    const roomConfigsContainer = document.getElementById('room-configs-container');
    const simRoomNameEl = document.getElementById('sim-room-name');
    const simDetailsListEl = document.getElementById('sim-details-list');
    const simTotalPriceEl = document.getElementById('sim-total-price');

    // Room Selection
    roomBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const roomName = btn.getAttribute('data-room');
            
            if (selectedRooms.includes(roomName)) {
                selectedRooms = selectedRooms.filter(r => r !== roomName);
                delete roomConfigs[roomName];
                if (activeRoom === roomName) {
                    activeRoom = selectedRooms[selectedRooms.length - 1] || null;
                }
            } else {
                selectedRooms.push(roomName);
                initRoomConfig(roomName);
                activeRoom = roomName; // Switch to newly added room
            }

            updateRoomButtonsUI();
            simRoomNameEl.textContent = selectedRooms.length > 0 ? selectedRooms.join(', ') : '未選択';
            renderRoomConfigs();
            calculateTotal();
        });
    });

    function updateRoomButtonsUI() {
        roomBtns.forEach(b => {
            const bRoom = b.getAttribute('data-room');
            const span = b.querySelector('span');
            if (selectedRooms.includes(bRoom)) {
                b.classList.add('border-primary', 'bg-primary/5', 'ring-primary/20', 'ring-4');
                b.classList.remove('border-slate-100', 'dark:border-slate-800');
                if (span) span.className = 'text-sm font-bold text-primary';
            } else {
                b.classList.remove('border-primary', 'bg-primary/5', 'ring-primary/20', 'ring-4');
                b.classList.add('border-slate-100', 'dark:border-slate-800');
                if (span) span.className = 'text-sm font-bold text-slate-700 dark:text-slate-200';
            }
        });
    }

    function renderRoomConfigs() {
        if (selectedRooms.length === 0) {
            roomConfigsContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                    <span class="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">corporate_fare</span>
                    <p class="text-slate-500 font-bold">施設を選択して設定を開始してください</p>
                </div>
            `;
            return;
        }

        if (!activeRoom || !selectedRooms.includes(activeRoom)) {
            activeRoom = selectedRooms[0];
        }

        // Tabs
        const tabsHtml = `
            <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                ${selectedRooms.map(room => {
                    const isActive = room === activeRoom;
                    return `
                        <button class="room-tab px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${isActive 
                            ? 'bg-primary text-white shadow-md translate-y-[2px]' 
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'}"
                            data-room="${room}">
                            ${room}
                        </button>
                    `;
                }).join('')}
            </div>
        `;

        const currentConfig = roomConfigs[activeRoom];
        const currentData = pricingData[activeRoom];
        
        const configPanelHtml = `
            <div class="room-config-block animate-in fade-in slide-in-from-bottom-4 duration-300" data-room="${activeRoom}">
                <div class="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
                        <h2 class="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                            <span class="material-symbols-outlined text-primary">edit_note</span>
                            ${activeRoom} の設定
                        </h2>
                        <button class="remove-room-btn text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors" data-room="${activeRoom}">
                            <span class="material-symbols-outlined text-sm">delete</span> 施設を解除
                        </button>
                    </div>

                    <div id="section-time-${activeRoom}" class="mb-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. 利用時間の指定</h3>
                        ${currentData.isHourly ? renderHourlyTimeUI(activeRoom, currentConfig) : renderNormalTimeUI(activeRoom, currentConfig)}
                    </div>

                    <div class="mb-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">2. 入場料等による加算</h3>
                        ${activeRoom === '創作コーナー' ? `
                            <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 text-sm">この施設では入場料等による加算は発生しません。</div>
                        ` : renderAdmissionUI(activeRoom, currentConfig)}
                    </div>

                    <div class="mb-10 p-5 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                        <h3 class="flex items-center gap-2 text-sm font-bold text-primary mb-2">
                            <span class="material-symbols-outlined text-lg">schedule</span>
                            本番時間の設定
                        </h3>
                        <p class="text-[10px] text-slate-500 mb-4 leading-relaxed">
                            ※本番時間と重なる区分・延長時間にのみ「入場料等による割増」が適用されます。
                        </p>
                        
                        <!-- Timeline Visualization -->
                        <div id="timeline-container-${activeRoom}" class="mb-6 bg-white dark:bg-slate-900 rounded-xl p-3 border border-primary/10">
                            ${renderTimeline(activeRoom)}
                        </div>

                        <div class="flex items-center gap-4">
                            <div class="flex-1">
                                <label class="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Start / 開始</label>
                                <input type="time" class="performance-time-input w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-primary focus:border-primary transition-all" data-room="${activeRoom}" data-type="start" value="${currentConfig.performanceTime.start}">
                            </div>
                            <div class="text-slate-300 mt-5 font-light">～</div>
                            <div class="flex-1">
                                <label class="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">End / 終了</label>
                                <input type="time" class="performance-time-input w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-primary focus:border-primary transition-all" data-room="${activeRoom}" data-type="end" value="${currentConfig.performanceTime.end}">
                            </div>
                        </div>
                    </div>

                    ${currentData.hasHvac ? `
                    <div class="mb-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">3. 冷暖房の使用時間の指定</h3>
                        ${renderHvacUI(activeRoom, currentConfig, currentData)}
                    </div>
                    ` : ''}

                    <div class="mb-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">${currentData.hasHvac ? '4' : '3'}. 附属設備・備品の選択</h3>
                        ${renderEquipmentUI(activeRoom, currentConfig, currentData)}
                    </div>

                </div>
            </div>
        `;

        roomConfigsContainer.innerHTML = tabsHtml + configPanelHtml;
        attachDynamicListeners();
    }

    function renderStepper(id, value, min, max, dataAttrs = '') {
        const isMax = max !== null && value >= max;
        const isMin = value <= min;
        
        let customClasses = "";
        let finalAttrs = dataAttrs;
        const classMatch = dataAttrs.match(/class=["']([^"']+)["']/);
        if (classMatch) {
            customClasses = " " + classMatch[1];
            finalAttrs = dataAttrs.replace(classMatch[0], "");
        }

        return `
            <div class="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shooter-stepper">
                <button type="button" class="stepper-btn stepper-minus px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 flex items-center justify-center transition-colors" 
                        ${isMin ? 'disabled' : ''} ${finalAttrs} data-action="minus">
                    <span class="material-symbols-outlined text-base">remove</span>
                </button>
                <input type="number" id="${id}" class="stepper-input w-10 border-0 bg-transparent text-center text-sm font-bold focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${customClasses}" 
                       value="${value}" min="${min}" ${max !== null ? `max="${max}"` : ''} ${finalAttrs} />
                <button type="button" class="stepper-btn stepper-plus px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 flex items-center justify-center transition-colors" 
                        ${isMax ? 'disabled' : ''} ${finalAttrs} data-action="plus">
                    <span class="material-symbols-outlined text-base">add</span>
                </button>
            </div>
        `;
    }

    function renderNormalTimeUI(roomName, config) {
        const segments = [
            { id: 'am', label: '午前 (9:00 - 12:00)' },
            { id: 'pm', label: '午後 (13:00 - 17:00)' },
            { id: 'night', label: '夜間 (18:00 - 21:30)' },
            { id: 'allday', label: '全日 (9:00 - 21:30)' }
        ];

        const isAmSelected = config.timeSegments.includes('am') || config.timeSegments.includes('allday');
        const isPmSelected = config.timeSegments.includes('pm') || config.timeSegments.includes('allday');
        const isNightSelected = config.timeSegments.includes('night') || config.timeSegments.includes('allday');

        const isMiddayDisabledByConsecutive = isAmSelected && isPmSelected;
        const isEveningDisabledByConsecutive = isPmSelected && isNightSelected;

        // Restriction Logic: Only allow extensions contiguous to selected blocks
        const canEarlyMorning = isAmSelected;
        const canMidday = isAmSelected || isPmSelected;
        const canEvening = isPmSelected || isNightSelected;

        return `
            <div class="space-y-6">
                <div>
                    <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">利用時間区分（複数選択可）</p>
                    <div class="flex flex-wrap gap-2">
                        ${segments.map(seg => `
                            <label class="time-label flex cursor-pointer items-center gap-2 rounded-full border ${config.timeSegments.includes(seg.id) ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'} px-4 py-2 text-sm transition-all">
                                <input class="hidden time-checkbox" type="checkbox" value="${seg.id}" data-room="${roomName}" ${config.timeSegments.includes(seg.id) ? 'checked' : ''} />
                                ${seg.label}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">more_time</span>延長時間
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-slate-500">早朝延長 (8:30～9:00)</label>
                            ${!canEarlyMorning ? `
                                <div class="h-9 flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700">午前・全日選択時のみ</div>
                            ` : `
                                <select class="room-ext-select rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" data-room="${roomName}" data-ext="早朝延長">
                                    <option value="0" ${config.extHours["早朝延長"] === 0 ? 'selected' : ''}>なし</option>
                                    <option value="1" ${config.extHours["早朝延長"] === 1 ? 'selected' : ''}>利用する (0.5h分)</option>
                                </select>
                            `}
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-slate-500">昼間延長 (12:00～13:00)</label>
                            ${isMiddayDisabledByConsecutive ? `
                                <div class="h-9 flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">利用料金なし (連用)</div>
                            ` : !canMidday ? `
                                <div class="h-9 flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700">午前・午後選択時のみ</div>
                            ` : `
                                <select class="room-ext-select rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" data-room="${roomName}" data-ext="昼間延長">
                                    <option value="0" ${config.extHours["昼間延長"] === 0 ? 'selected' : ''}>なし</option>
                                    <option value="1" ${config.extHours["昼間延長"] === 1 ? 'selected' : ''}>利用する (1h分)</option>
                                </select>
                            `}
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-slate-500">夕方延長 (17:00～18:00)</label>
                            ${isEveningDisabledByConsecutive ? `
                                <div class="h-9 flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">利用料金なし (連用)</div>
                            ` : !canEvening ? `
                                <div class="h-9 flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700">午後・夜間選択時のみ</div>
                            ` : `
                                <select class="room-ext-select rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" data-room="${roomName}" data-ext="夕方延長">
                                    <option value="0" ${config.extHours["夕方延長"] === 0 ? 'selected' : ''}>なし</option>
                                    <option value="1" ${config.extHours["夕方延長"] === 1 ? 'selected' : ''}>利用する (1h分)</option>
                                </select>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderHourlyTimeUI(roomName, config) {
        return `
            <div class="space-y-6">
                <p class="text-sm text-slate-600 dark:text-slate-400">利用する時間数を入力してください。</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">一般 (¥230/h)</label>
                        <div class="flex items-center gap-2">
                            ${renderStepper('', config.creationHours.adult, 0, null, `data-room="${roomName}" data-type="adult" class="room-creation-input"`)}
                            <span class="text-sm text-slate-500">時間</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">小・中学生 (¥110/h)</label>
                        <div class="flex items-center gap-2">
                            ${renderStepper('', config.creationHours.child, 0, null, `data-room="${roomName}" data-type="child" class="room-creation-input"`)}
                            <span class="text-sm text-slate-500">時間</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAdmissionUI(roomName, config) {
        return `
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-slate-500 mb-1">入場料等 (円)</label>
                    <div class="relative">
                        <input type="number" class="room-admission-fee-input w-full rounded-xl border-slate-200 bg-white dark:bg-slate-900 text-right pr-8 font-medium focus:ring-primary focus:border-primary transition-all" 
                            data-room="${roomName}" min="0" value="${config.admissionFee || 0}" />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">円</span>
                    </div>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">加算倍率の内訳</p>
                    <ul class="text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                        <li id="adm-rank-10" class="flex justify-between items-center ${config.admissionMult === 1.0 ? 'text-primary font-bold' : ''}">
                            <span>徴収なし (0円)</span>
                            <span>1.0倍</span>
                        </li>
                        <li id="adm-rank-13" class="flex justify-between items-center ${config.admissionMult === 1.3 ? 'text-primary font-bold' : ''}">
                            <span>1,000円未満</span>
                            <span>1.3倍</span>
                        </li>
                        <li id="adm-rank-15" class="flex justify-between items-center ${config.admissionMult === 1.5 ? 'text-primary font-bold' : ''}">
                            <span>1,000円 ～ 3,000円未満</span>
                            <span>1.5倍</span>
                        </li>
                        <li id="adm-rank-20" class="flex justify-between items-center ${config.admissionMult === 2.0 ? 'text-primary font-bold' : ''}">
                            <span>3,000円以上</span>
                            <span>2.0倍</span>
                        </li>
                    </ul>
                </div>
                <div class="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                    <span class="text-xs font-bold text-slate-500">適用倍率:</span>
                    <span id="adm-mult-val" class="text-sm font-extrabold text-primary">${config.admissionMult.toFixed(1)}倍</span>
                </div>
            </div>
        `;
    }

    function renderHvacUI(roomName, config, data) {
        return `
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                    <label class="flex items-center gap-1 font-bold text-slate-700"><span class="material-symbols-outlined text-blue-500 text-sm">ac_unit</span>冷房(h)</label>
                    <div class="flex items-center gap-2">
                        ${renderStepper('', config.hvac.cooler, 0, null, `data-room="${roomName}" data-type="cooler" class="room-hvac-input"`)}
                    </div>
                    <p class="text-[10px] text-slate-400">¥${data.coolerRate}/h</p>
                </div>
                <div class="space-y-2">
                    <label class="flex items-center gap-1 font-bold text-slate-700"><span class="material-symbols-outlined text-red-500 text-sm">heat_pump</span>暖房(h)</label>
                    <div class="flex items-center gap-2">
                        ${renderStepper('', config.hvac.heater, 0, null, `data-room="${roomName}" data-type="heater" class="room-hvac-input"`)}
                    </div>
                    <p class="text-[10px] text-slate-400">¥${data.heaterRate}/h</p>
                </div>
            </div>
        `;
    }

    function renderEquipmentUI(roomName, config, data) {
        let eqs = [];
        if (data.isHourly) {
            eqs = [...(data.specificEq || [])];
        } else {
            const specNames = (data.specificEq || []).map(e => e.name);
            eqs = [...(data.specificEq || []), ...commonEq.filter(ce => !specNames.includes(ce.name))];
        }

        if (roomName === "スインクホール" || roomName === "セミナー室") {
            eqs = eqs.filter(e => e.name !== "司会者台");
        }

        return `
            <div class="space-y-4">
                ${eqs.map(eq => {
                    return `
                    <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div class="flex flex-col">
                                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${eq.name}</span>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[11px] text-primary font-bold">¥${eq.price.toLocaleString()}</span>
                                    <span class="text-[10px] text-slate-400 font-medium">/ 区分 (最大${eq.max})</span>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            ${['午前', '午後', '夜間'].map(seg => `
                                <div class="flex flex-col gap-1.5 items-center">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${seg}</span>
                                    ${renderStepper('', config.equipment[eq.name + '_' + seg] || 0, 0, eq.max, `data-room="${roomName}" data-name="${eq.name}" data-seg="${seg}" class="room-eq-input"`)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    }

    function renderPriceAdjustmentUI(roomName, config, data) {
        if (data.isHourly) {
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">一般 単価 (¥/h)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'adultRate', data.adultRate)}" data-room="${roomName}" data-field="adultRate" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">小中学生 単価 (¥/h)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'childRate', data.childRate)}" data-room="${roomName}" data-field="childRate" />
                    </div>
                </div>
            `;
        }

        return `
            <div class="space-y-4">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">午前 基本料金</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'baseAm', data.baseAm)}" data-room="${roomName}" data-field="baseAm" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">午後 基本料金</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'basePm', data.basePm)}" data-room="${roomName}" data-field="basePm" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">夜間 基本料金</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'baseNight', data.baseNight)}" data-room="${roomName}" data-field="baseNight" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">全日 基本料金 (合計)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm font-bold bg-slate-50" value="${getPrice(roomName, 'baseAllday', data.baseAllday)}" data-room="${roomName}" data-field="baseAllday" />
                    </div>
                </div>

                <div class="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p class="text-[10px] font-bold text-blue-600 mb-3 flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs">info</span>
                        全日利用時の区分別単価（割増計算用）
                    </p>
                    <div class="grid grid-cols-3 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-[10px] font-medium text-slate-400">全日-午前</label>
                            <input type="number" class="room-price-override rounded border-slate-200 text-xs" value="${getPrice(roomName, 'alldayAm', data.alldayAm)}" data-room="${roomName}" data-field="alldayAm" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-[10px] font-medium text-slate-400">全日-午後</label>
                            <input type="number" class="room-price-override rounded border-slate-200 text-xs" value="${getPrice(roomName, 'alldayPm', data.alldayPm)}" data-room="${roomName}" data-field="alldayPm" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-[10px] font-medium text-slate-400">全日-夜間</label>
                            <input type="number" class="room-price-override rounded border-slate-200 text-xs" value="${getPrice(roomName, 'alldayNight', data.alldayNight)}" data-room="${roomName}" data-field="alldayNight" />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">延長 単価 (¥/h)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'extHour', data.extHour)}" data-room="${roomName}" data-field="extHour" />
                    </div>
                    ${data.hasHvac ? `
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">冷房 単価 (¥/h)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'coolerRate', data.coolerRate)}" data-room="${roomName}" data-field="coolerRate" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-medium text-slate-500">暖房 単価 (¥/h)</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'heaterRate', data.heaterRate)}" data-room="${roomName}" data-field="heaterRate" />
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function attachDynamicListeners() {
        document.querySelectorAll('.room-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeRoom = tab.getAttribute('data-room');
                renderRoomConfigs();
            });
        });

        document.querySelectorAll('.remove-room-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const roomName = btn.getAttribute('data-room');
                selectedRooms = selectedRooms.filter(r => r !== roomName);
                delete roomConfigs[roomName];
                if (activeRoom === roomName) {
                    activeRoom = selectedRooms[selectedRooms.length - 1] || null;
                }
                updateRoomButtonsUI();
                renderRoomConfigs();
                calculateTotal();
            });
        });

        document.querySelectorAll('.time-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const room = cb.getAttribute('data-room');
                const val = cb.value;
                if (val === 'allday' && cb.checked) {
                    roomConfigs[room].timeSegments = ['allday'];
                    roomConfigs[room].extHours["昼間延長"] = 0;
                    roomConfigs[room].extHours["夕方延長"] = 0;
                } else if (cb.checked) {
                    roomConfigs[room].timeSegments = roomConfigs[room].timeSegments.filter(s => s !== 'allday');
                    roomConfigs[room].timeSegments.push(val);
                    // Reset extensions if consecutive segments are formed
                    const segs = roomConfigs[room].timeSegments;
                    if (segs.includes('am') && segs.includes('pm')) roomConfigs[room].extHours["昼間延長"] = 0;
                    if (segs.includes('pm') && segs.includes('night')) roomConfigs[room].extHours["夕方延長"] = 0;
                } else {
                    roomConfigs[room].timeSegments = roomConfigs[room].timeSegments.filter(s => s !== val);
                }

                // WIPE OUT invalid extensions based on selected segments
                const segs = roomConfigs[room].timeSegments;
                if (!segs.includes('am') && !segs.includes('allday')) {
                    roomConfigs[room].extHours["早朝延長"] = 0;
                }
                if (!segs.includes('am') && !segs.includes('pm') && !segs.includes('allday')) {
                    roomConfigs[room].extHours["昼間延長"] = 0;
                }
                if (!segs.includes('pm') && !segs.includes('night') && !segs.includes('allday')) {
                    roomConfigs[room].extHours["夕方延長"] = 0;
                }

                renderRoomConfigs();
                calculateTotal();
            });
        });

        document.querySelectorAll('.room-ext-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const room = sel.getAttribute('data-room');
                const ext = sel.getAttribute('data-ext');
                roomConfigs[room].extHours[ext] = parseFloat(sel.value);
                calculateTotal();
            });
        });

        document.querySelectorAll('.stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const container = btn.closest('.shooter-stepper');
                const input = container.querySelector('.stepper-input');
                let val = parseInt(input.value) || 0;
                const min = parseInt(input.getAttribute('min')) || 0;
                const max = input.hasAttribute('max') ? parseInt(input.getAttribute('max')) : null;

                if (action === 'plus') {
                    if (max === null || val < max) val++;
                } else if (action === 'minus') {
                    if (val > min) val--;
                }

                input.value = val;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                container.querySelector('.stepper-minus').disabled = (val <= min);
                if (max !== null) {
                    container.querySelector('.stepper-plus').disabled = (val >= max);
                }
            });
        });

        document.querySelectorAll('.room-creation-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const type = input.getAttribute('data-type');
                let val = parseFloat(input.value) || 0;
                if (val < 0) { val = 0; input.value = 0; }
                roomConfigs[room].creationHours[type] = val;

                const container = input.closest('.shooter-stepper');
                if (container) {
                    container.querySelector('.stepper-minus').disabled = (val <= 0);
                }

                calculateTotal();
            });
        });

        document.querySelectorAll('.room-admission-fee-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const fee = parseFloat(input.value) || 0;
                roomConfigs[room].admissionFee = fee;
                const mult = calculateAdmissionMult(fee);
                roomConfigs[room].admissionMult = mult;

                // UI Partial Update (to avoid focus loss)
                const multVal = document.getElementById('adm-mult-val');
                if (multVal) multVal.textContent = mult.toFixed(1) + '倍';

                ['10', '13', '15', '20'].forEach(r => {
                    const el = document.getElementById('adm-rank-' + r);
                    if (el) {
                        const targetMult = parseFloat(r) / 10;
                        if (Math.abs(mult - targetMult) < 0.01) {
                            el.classList.add('text-primary', 'font-bold');
                        } else {
                            el.classList.remove('text-primary', 'font-bold');
                        }
                    }
                });

                calculateTotal();
            });
        });

        document.querySelectorAll('.room-hvac-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const type = input.getAttribute('data-type');
                let val = parseFloat(input.value) || 0;
                if (val < 0) { val = 0; input.value = 0; }
                roomConfigs[room].hvac[type] = val;

                const container = input.closest('.shooter-stepper');
                if (container) {
                    container.querySelector('.stepper-minus').disabled = (val <= 0);
                }

                calculateTotal();
            });
        });

        document.querySelectorAll('.room-eq-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const name = input.getAttribute('data-name');
                const seg = input.getAttribute('data-seg');
                const max = input.hasAttribute('max') ? parseInt(input.getAttribute('max')) : null;
                const min = parseInt(input.getAttribute('min')) || 0;
                let val = parseInt(input.value) || 0;
                
                if (max !== null && val > max) { val = max; input.value = max; }
                if (val < min) { val = min; input.value = min; }
                
                roomConfigs[room].equipment[name + '_' + seg] = val;

                const container = input.closest('.shooter-stepper');
                if (container) {
                    container.querySelector('.stepper-minus').disabled = (val <= min);
                    if (max !== null) {
                        container.querySelector('.stepper-plus').disabled = (val >= max);
                    }
                }
                
                calculateTotal();
            });
        });

        document.querySelectorAll('.room-price-override').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const field = input.getAttribute('data-field');
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    roomConfigs[room].overrides[field] = val;
                } else {
                    delete roomConfigs[room].overrides[field];
                }
                calculateTotal();
            });
        });

        document.querySelectorAll('.performance-time-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const type = input.getAttribute('data-type');
                roomConfigs[room].performanceTime[type] = input.value;
                calculateTotal();
            });
        });
    }

    function calculateTotal() {
        let grandTotal = 0;
        let detailsHtml = '';
        let fullSummaryText = '【大垣市情報工房 利用料金見積（概算）】\n\n';

        selectedRooms.forEach(roomName => {
            const data = pricingData[roomName];
            const config = roomConfigs[roomName];
            let roomTotal = 0;
            let roomSubDetails = [];

            fullSummaryText += `■ ${roomName}\n`;

            if (data.isHourly) {
                const adultRate = getPrice(roomName, 'adultRate', data.adultRate);
                const childRate = getPrice(roomName, 'childRate', data.childRate);
                const aH = config.creationHours.adult;
                const cH = config.creationHours.child;
                const aT = aH * adultRate;
                const cT = cH * childRate;
                roomTotal = aT + cT;
                if (aH > 0) {
                    roomSubDetails.push(`一般 ${aH}h (¥${aT.toLocaleString()})`);
                    fullSummaryText += ` ・一般 ${aH}h: ¥${aT.toLocaleString()}\n`;
                }
                if (cH > 0) {
                    roomSubDetails.push(`小中学生 ${cH}h (¥${cT.toLocaleString()})`);
                    fullSummaryText += ` ・小中学生 ${cH}h: ¥${cT.toLocaleString()}\n`;
                }
            } else {
                let baseTotal = 0;
                let segTotals = { am: 0, pm: 0, night: 0 };
                const hasAm = config.timeSegments.includes('am');
                const hasPm = config.timeSegments.includes('pm');
                const hasNight = config.timeSegments.includes('night');
                const isEffectiveAllday = config.timeSegments.includes('allday') || (hasAm && hasPm && hasNight);

                const bAm = getPrice(roomName, isEffectiveAllday ? 'alldayAm' : 'baseAm', isEffectiveAllday ? data.alldayAm : data.baseAm);
                const bPm = getPrice(roomName, isEffectiveAllday ? 'alldayPm' : 'basePm', isEffectiveAllday ? data.alldayPm : data.basePm);
                const bNight = getPrice(roomName, isEffectiveAllday ? 'alldayNight' : 'baseNight', isEffectiveAllday ? data.alldayNight : data.baseNight);
                const extHourUnitPrice = getPrice(roomName, 'extHour', data.extHour);

                const perfRange = config.performanceTime;
                const mult = config.admissionMult;

                if (isEffectiveAllday) {
                    const finalAm = isOverlap(perfRange, timeRanges["am"]) ? Math.round(bAm * mult) : bAm;
                    const finalPm = isOverlap(perfRange, timeRanges["pm"]) ? Math.round(bPm * mult) : bPm;
                    const finalNight = isOverlap(perfRange, timeRanges["night"]) ? Math.round(bNight * mult) : bNight;
                    baseTotal = finalAm + finalPm + finalNight;
                    if (finalAm > bAm) roomSubDetails.push(`午前割増(全日): ¥${(finalAm - bAm).toLocaleString()}`);
                    if (finalPm > bPm) roomSubDetails.push(`午後割増(全日): ¥${(finalPm - bPm).toLocaleString()}`);
                    if (finalNight > bNight) roomSubDetails.push(`夜間割増(全日): ¥${(finalNight - bNight).toLocaleString()}`);
                } else {
                    if (hasAm) {
                        const fee = bAm;
                        const finalFee = isOverlap(perfRange, timeRanges["am"]) ? Math.round(fee * mult) : fee;
                        baseTotal += finalFee;
                        if (finalFee > fee) roomSubDetails.push(`午前割増: ¥${(finalFee - fee).toLocaleString()}`);
                    }
                    if (hasPm) {
                        const fee = bPm;
                        const finalFee = isOverlap(perfRange, timeRanges["pm"]) ? Math.round(fee * mult) : fee;
                        baseTotal += finalFee;
                        if (finalFee > fee) roomSubDetails.push(`午後割増: ¥${(finalFee - fee).toLocaleString()}`);
                    }
                    if (hasNight) {
                        const fee = bNight;
                        const finalFee = isOverlap(perfRange, timeRanges["night"]) ? Math.round(fee * mult) : fee;
                        baseTotal += finalFee;
                        if (finalFee > fee) roomSubDetails.push(`夜間割増: ¥${(finalFee - fee).toLocaleString()}`);
                    }
                }

                let extTotal = 0;
                const isAmPm = (hasAm && hasPm) || isEffectiveAllday;
                const isPmNight = (hasPm && hasNight) || isEffectiveAllday;

                for (let key in config.extHours) {
                    const h = config.extHours[key];
                    if (h > 0) {
                        if (key === "昼間延長" && isAmPm) continue;
                        if (key === "夕方延長" && isPmNight) continue;
                        if (key === "早朝延長" && !hasAm && !isEffectiveAllday) continue;
                        if (key === "昼間延長" && !hasAm && !hasPm && !isEffectiveAllday) continue;
                        if (key === "夕方延長" && !hasPm && !hasNight && !isEffectiveAllday) continue;

                        const rawFee = extHourUnitPrice * h;
                        let finalFee = rawFee;
                        const isNoSurchargeExt = isEffectiveAllday && (key === "昼間延長" || key === "夕方延長");
                        if (!isNoSurchargeExt && isOverlap(perfRange, timeRanges[key])) {
                            finalFee = Math.round(rawFee * mult);
                            if (finalFee > rawFee) roomSubDetails.push(`${key}割増: ¥${(finalFee - rawFee).toLocaleString()}`);
                        }
                        extTotal += finalFee;
                        roomSubDetails.push(`${key} ${h}h: ¥${finalFee.toLocaleString()}`);
                    }
                }

                roomTotal = baseTotal + extTotal;
                if (roomTotal > 0) {
                    roomSubDetails.unshift(`基本+延長: ¥${roomTotal.toLocaleString()}`);
                    fullSummaryText += ` ・施設利用料（割増含）: ¥${roomTotal.toLocaleString()}\n`;
                }
            }

            if (data.hasHvac) {
                const coolerRate = getPrice(roomName, 'coolerRate', data.coolerRate);
                const heaterRate = getPrice(roomName, 'heaterRate', data.heaterRate);
                const cT = config.hvac.cooler * coolerRate;
                const hT = config.hvac.heater * heaterRate;
                if (cT > 0) { 
                    roomTotal += cT; 
                    roomSubDetails.push(`冷房 ${config.hvac.cooler}h (¥${cT.toLocaleString()})`);
                    fullSummaryText += ` ・冷房費: ¥${cT.toLocaleString()}\n`;
                }
                if (hT > 0) { 
                    roomTotal += hT; 
                    roomSubDetails.push(`暖房 ${config.hvac.heater}h (¥${hT.toLocaleString()})`);
                    fullSummaryText += ` ・暖房費: ¥${hT.toLocaleString()}\n`;
                }
            }

            let roomEqCost = 0;
            for (let key in config.equipment) {
                const qty = config.equipment[key];
                if (qty > 0) {
                    const [name, seg] = key.split('_');
                    let price = 0;
                    const spec = (data.specificEq || []).find(e => e.name === name);
                    const defaultPrice = spec ? spec.price : (commonEq.find(e => e.name === name)?.price || 0);
                    price = getPrice(roomName, `eq_${name}`, defaultPrice);
                    roomEqCost += price * qty;
                }
            }
            roomTotal += roomEqCost;
            if (roomEqCost > 0) {
                roomSubDetails.push(`附属設備: ¥${roomEqCost.toLocaleString()}`);
                fullSummaryText += ` ・附属設備費: ¥${roomEqCost.toLocaleString()}\n`;
            }

            fullSummaryText += ` [小計: ¥${roomTotal.toLocaleString()}]\n\n`;

            if (roomTotal > 0) {
                grandTotal += roomTotal;
                detailsHtml += `
                    <div class="flex flex-col text-sm mb-4 pb-4 border-b border-slate-100 last:border-0 animate-in slide-in-from-right-2 duration-300">
                        <div class="flex justify-between font-bold mb-1"><span class="text-primary">${roomName}</span><span>¥${roomTotal.toLocaleString()}</span></div>
                        <div class="text-[11px] text-slate-500 space-y-0.5">${roomSubDetails.map(d => `<div>・${d}</div>`).join('')}</div>
                    </div>
                `;
            }

            // Update Timeline for the active room or if it's the only one
            const timelineContainer = document.getElementById(`timeline-container-${roomName}`);
            if (timelineContainer) {
                timelineContainer.innerHTML = renderTimeline(roomName);
            }
        });

        fullSummaryText += `--------------------\n`;
        fullSummaryText += `合計金額 (税込): ¥${grandTotal.toLocaleString()}\n`;
        fullSummaryText += `\n※本見積は概算です。正確な料金は窓口でご確認ください。\n`;

        simDetailsListEl.innerHTML = detailsHtml || '<div class="text-slate-400 text-center py-8">施設と条件を選択してください</div>';
        simTotalPriceEl.textContent = `¥${grandTotal.toLocaleString()}`;
        
        // Mobile bar update
        const mobTotalBar = document.getElementById('mobile-total-bar');
        const mobPrice = document.getElementById('mobile-total-price');
        if (mobPrice) mobPrice.textContent = `¥${grandTotal.toLocaleString()}`;
        if (mobTotalBar) {
            if (grandTotal > 0) {
                mobTotalBar.classList.remove('translate-y-full');
            } else {
                mobTotalBar.classList.add('translate-y-full');
            }
        }

        // Add copy event
        const copyBtn = document.getElementById('copy-estimate-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(fullSummaryText).then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span class="material-symbols-outlined text-base">check</span>コピーしました！';
                    copyBtn.classList.replace('bg-slate-900', 'bg-emerald-600');
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.replace('bg-emerald-600', 'bg-slate-900');
                    }, 2000);
                });
            };
        }
    }

    function renderTimeline(roomName) {
        const config = roomConfigs[roomName];
        if (!config || pricingData[roomName].isHourly) return '';
        
        const startTotal = timeToMinutes("09:00");
        const endTotal = timeToMinutes("21:30");
        const totalDuration = endTotal - startTotal;

        const getPos = (timeStr) => {
            const mins = timeToMinutes(timeStr);
            return Math.max(0, Math.min(100, ((mins - startTotal) / totalDuration) * 100));
        };

        const segments = [
            { id: 'am', color: 'bg-blue-400/20', border: 'border-blue-400/30' },
            { id: 'pm', color: 'bg-emerald-400/20', border: 'border-emerald-400/30' },
            { id: 'night', color: 'bg-purple-400/20', border: 'border-purple-400/30' }
        ];

        return `
            <div class="relative w-full h-12 flex flex-col pt-4">
                <div class="absolute -top-1 left-0 right-0 flex justify-between px-1">
                    <span class="text-[9px] font-bold text-slate-300">9:00</span>
                    <span class="text-[9px] font-bold text-slate-300">12:00</span>
                    <span class="text-[9px] font-bold text-slate-300">17:00</span>
                    <span class="text-[9px] font-bold text-slate-300">21:30</span>
                </div>
                
                <div class="relative w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                    ${segments.map(s => {
                        const range = timeRanges[s.id];
                        const left = getPos(range.start);
                        const width = getPos(range.end) - left;
                        const isSelected = config.timeSegments.includes(s.id) || config.timeSegments.includes('allday');
                        return `
                            <div class="absolute top-0 bottom-0 ${isSelected ? s.color : 'bg-transparent'} border-x ${s.border} transition-colors" 
                                 style="left: ${left}%; width: ${width}%;"></div>
                        `;
                    }).join('')}

                    <div class="absolute top-1.5 bottom-1.5 bg-primary/80 rounded-full z-10 transition-all shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                         style="left: ${getPos(config.performanceTime.start)}%; width: ${getPos(config.performanceTime.end) - getPos(config.performanceTime.start)}%;">
                    </div>
                </div>

                <div class="mt-2 flex items-center justify-center gap-4">
                    <div class="flex items-center gap-1.5">
                        <div class="w-3 h-1.5 bg-primary/80 rounded-full"></div>
                        <span class="text-[10px] text-slate-500 font-bold">本番時間</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="w-2.5 h-2.5 ${segments[0].color} border ${segments[0].border} rounded-sm"></div>
                        <span class="text-[10px] text-slate-500 font-bold">選択区分</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Scroll to result button listener
    document.getElementById('mobile-scroll-to-result')?.addEventListener('click', () => {
        const target = document.querySelector('.lg\\:w-1\\/3');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    const resetBtn = document.getElementById('reset-inputs-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (!confirm('入力をリセットしてもよろしいですか？')) return;
            selectedRooms = [];
            roomConfigs = {};
            activeRoom = null;
            updateRoomButtonsUI();
            renderRoomConfigs();
            calculateTotal();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    updateRoomButtonsUI();
    renderRoomConfigs();
    calculateTotal();
});
