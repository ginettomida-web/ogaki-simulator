document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Navigation Logic (Simulator only) ----
    const navBtns = document.querySelectorAll('.nav-btn');
    // Navigation is disabled as only one view exists now

    // ---- 2. Pricing Data Structure ----
    const pricingData = {
        "スインクホール": {
            baseAm: 12030, basePm: 16050, baseNight: 17550, baseAllday: 38790,
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
            extHour: 1800,
            hasHvac: true, coolerRate: 600, heaterRate: 810,
            specificEq: [
                { name: "演台", price: 360, max: 1 },
                { name: "音響設備", price: 540, max: 1 },
                { name: "映像設備", price: 2140, max: 1 }
            ]
        },
        "研修室": {
            baseAm: 1730, basePm: 2300, baseNight: 2520, baseAllday: 5600, 
            extHour: 720,
            hasHvac: false,
            specificEq: []
        },
        "多目的研修室": {
            baseAm: 4120, basePm: 5510, baseNight: 6020, baseAllday: 13320,
            extHour: 1720,
            hasHvac: false,
            specificEq: []
        },
        "会議室１": {
            baseAm: 850, basePm: 1150, baseNight: 1250, baseAllday: 2780,
            extHour: 350,
            hasHvac: false,
            specificEq: []
        },
        "会議室２": {
            baseAm: 850, basePm: 1150, baseNight: 1250, baseAllday: 2780,
            extHour: 350,
            hasHvac: false,
            specificEq: []
        },
        "会議室３": {
            baseAm: 2490, basePm: 3320, baseNight: 3630, baseAllday: 8040,
            extHour: 1030,
            hasHvac: false,
            specificEq: []
        },
        "会議室４": {
            baseAm: 3800, basePm: 5070, baseNight: 5540, baseAllday: 12250,
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
            admissionMults: { am: 1.0, pm: 1.0, night: 1.0 },
            hvac: { cooler: 0, heater: 0 },
            equipment: {}, // { name_segment: qty }
            overrides: {}  // { fieldName: value }
        };
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
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">2. 入場料等による加算倍率</h3>
                        ${activeRoom === '創作コーナー' ? `
                            <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 text-sm">この施設では入場料等による加算は発生しません。</div>
                        ` : renderAdmissionUI(activeRoom, currentConfig)}
                    </div>

                    ${currentData.hasHvac ? `
                    <div class="mb-10">
                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">3. 冷暖房の使用時間の指定</h3>
                        ${renderHvacUI(activeRoom, currentConfig, currentData)}
                    </div>
                    ` : ''}

                    <div class="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 class="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                            <span class="material-symbols-outlined text-base">settings_suggest</span>
                            単価の調整（管理者・特別設定用）
                        </h3>
                        ${renderPriceAdjustmentUI(activeRoom, currentConfig, currentData)}
                    </div>
                </div>
            </div>
        `;

        roomConfigsContainer.innerHTML = tabsHtml + configPanelHtml;
        attachDynamicListeners();
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
                <p class="text-sm text-slate-600 dark:text-slate-400">利用する時間数を直接入力してください。</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">一般 (¥230/h)</label>
                        <div class="flex items-center gap-2">
                            <input class="room-creation-input w-24 rounded-lg border-slate-200 text-right" type="number" min="0" value="${config.creationHours.adult}" data-room="${roomName}" data-type="adult" />
                            <span class="text-sm text-slate-500">時間</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">小・中学生 (¥110/h)</label>
                        <div class="flex items-center gap-2">
                            <input class="room-creation-input w-24 rounded-lg border-slate-200 text-right" type="number" min="0" value="${config.creationHours.child}" data-room="${roomName}" data-type="child" />
                            <span class="text-sm text-slate-500">時間</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAdmissionUI(roomName, config) {
        const segments = [
            { id: 'am', label: '午前', color: 'bg-blue-500' },
            { id: 'pm', label: '午後', color: 'bg-emerald-500' },
            { id: 'night', label: '夜間', color: 'bg-purple-500' }
        ];
        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${segments.map(seg => `
                    <div class="p-3 rounded-xl border ${config.admissionMults[seg.id] > 1.0 ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}">
                        <label class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                            <div class="w-1.5 h-1.5 rounded-full ${seg.color}"></div>${seg.label}
                        </label>
                        <select class="room-admission-select w-full rounded-lg border-slate-200 bg-white text-xs" data-room="${roomName}" data-seg="${seg.id}">
                            <option value="1.0" ${config.admissionMults[seg.id] == 1.0 ? 'selected' : ''}>なし</option>
                            <option value="1.3" ${config.admissionMults[seg.id] == 1.3 ? 'selected' : ''}>1,000円未満</option>
                            <option value="1.5" ${config.admissionMults[seg.id] == 1.5 ? 'selected' : ''}>1,000-3,000円</option>
                            <option value="2.0" ${config.admissionMults[seg.id] == 2.0 ? 'selected' : ''}>3,000円以上</option>
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderHvacUI(roomName, config, data) {
        return `
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                    <label class="flex items-center gap-1 font-bold text-slate-700"><span class="material-symbols-outlined text-blue-500 text-sm">ac_unit</span>冷房(h)</label>
                    <input class="room-hvac-input w-full rounded-lg border-slate-200 text-right" type="number" min="0" value="${config.hvac.cooler}" data-room="${roomName}" data-type="cooler" />
                    <p class="text-[10px] text-slate-400">¥${data.coolerRate}/h</p>
                </div>
                <div class="space-y-2">
                    <label class="flex items-center gap-1 font-bold text-slate-700"><span class="material-symbols-outlined text-red-500 text-sm">heat_pump</span>暖房(h)</label>
                    <input class="room-hvac-input w-full rounded-lg border-slate-200 text-right" type="number" min="0" value="${config.hvac.heater}" data-room="${roomName}" data-type="heater" />
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
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400">
                            <th class="pb-2">設備名</th>
                            <th class="pb-2 text-right">単価調整</th>
                            <th class="pb-2 text-center">午前</th>
                            <th class="pb-2 text-center">午後</th>
                            <th class="pb-2 text-center">夜間</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 dark:divide-slate-800/50">
                        ${eqs.map(eq => {
                            const currentPrice = getPrice(roomName, `eq_${eq.name}`, eq.price);
                            return `
                            <tr>
                                <td class="py-2 pr-2 font-medium">${eq.name} <span class="text-[10px] text-slate-400">(最大${eq.max})</span></td>
                                <td class="py-2 px-1 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <span class="text-[10px] text-slate-400">¥</span>
                                        <input type="number" class="room-price-override w-16 px-1 rounded border-slate-200 text-right text-xs" 
                                               value="${currentPrice}" data-room="${roomName}" data-field="eq_${eq.name}" />
                                    </div>
                                </td>
                                ${['午前', '午後', '夜間'].map(seg => `
                                    <td class="py-2 px-1 text-center">
                                        <input type="number" class="room-eq-input w-16 px-1 rounded-lg border-slate-200 text-right text-xs" min="0" max="${eq.max}" 
                                               value="${config.equipment[eq.name + '_' + seg] || 0}" data-room="${roomName}" data-name="${eq.name}" data-seg="${seg}" />
                                    </td>
                                `).join('')}
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
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
                        <label class="text-xs font-medium text-slate-500">全日 基本料金</label>
                        <input type="number" class="room-price-override rounded-lg border-slate-200 text-sm" value="${getPrice(roomName, 'baseAllday', data.baseAllday)}" data-room="${roomName}" data-field="baseAllday" />
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

        document.querySelectorAll('.room-creation-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const type = input.getAttribute('data-type');
                roomConfigs[room].creationHours[type] = parseFloat(input.value) || 0;
                calculateTotal();
            });
        });

        document.querySelectorAll('.room-admission-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const room = sel.getAttribute('data-room');
                const seg = sel.getAttribute('data-seg');
                roomConfigs[room].admissionMults[seg] = parseFloat(sel.value);
                renderRoomConfigs();
                calculateTotal();
            });
        });

        document.querySelectorAll('.room-hvac-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const type = input.getAttribute('data-type');
                roomConfigs[room].hvac[type] = parseFloat(input.value) || 0;
                calculateTotal();
            });
        });

        document.querySelectorAll('.room-eq-input').forEach(input => {
            input.addEventListener('input', () => {
                const room = input.getAttribute('data-room');
                const name = input.getAttribute('data-name');
                const seg = input.getAttribute('data-seg');
                const max = parseInt(input.getAttribute('max'));
                let val = parseInt(input.value) || 0;
                if (val > max) { val = max; input.value = max; }
                if (val < 0) { val = 0; input.value = 0; }
                roomConfigs[room].equipment[name + '_' + seg] = val;
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
    }

    function calculateTotal() {
        let grandTotal = 0;
        let detailsHtml = '';

        selectedRooms.forEach(roomName => {
            const data = pricingData[roomName];
            const config = roomConfigs[roomName];
            let roomTotal = 0;
            let roomSubDetails = [];

            if (data.isHourly) {
                const adultRate = getPrice(roomName, 'adultRate', data.adultRate);
                const childRate = getPrice(roomName, 'childRate', data.childRate);
                const aH = config.creationHours.adult;
                const cH = config.creationHours.child;
                const aT = aH * adultRate;
                const cT = cH * childRate;
                roomTotal = aT + cT;
                if (aH > 0) roomSubDetails.push(`一般 ${aH}h (¥${aT.toLocaleString()})`);
                if (cH > 0) roomSubDetails.push(`小中学生 ${cH}h (¥${cT.toLocaleString()})`);
            } else {
                let baseTotal = 0;
                let segTotals = { am: 0, pm: 0, night: 0 };
                const hasAm = config.timeSegments.includes('am');
                const hasPm = config.timeSegments.includes('pm');
                const hasNight = config.timeSegments.includes('night');
                const isEffectiveAllday = config.timeSegments.includes('allday') || (hasAm && hasPm && hasNight);

                const baseAm = getPrice(roomName, 'baseAm', data.baseAm);
                const basePm = getPrice(roomName, 'basePm', data.basePm);
                const baseNight = getPrice(roomName, 'baseNight', data.baseNight);
                const baseAllday = getPrice(roomName, 'baseAllday', data.baseAllday);

                if (isEffectiveAllday) {
                    baseTotal = baseAllday;
                } else {
                    if (hasAm) { baseTotal += baseAm; segTotals.am = baseAm; }
                    if (hasPm) { baseTotal += basePm; segTotals.pm = basePm; }
                    if (hasNight) { baseTotal += baseNight; segTotals.night = baseNight; }
                }
                // Extensions
                let extH = 0;
                let extDetails = [];
                const segs = config.timeSegments;
                const isAmPm = (hasAm && hasPm) || isEffectiveAllday;
                const isPmNight = (hasPm && hasNight) || isEffectiveAllday;

                const extHourUnitPrice = getPrice(roomName, 'extHour', data.extHour);
                for (let key in config.extHours) {
                    const h = config.extHours[key];
                    if (h > 0) {
                        // Skip midday/evening if consecutive
                        if (key === "昼間延長" && isAmPm) continue;
                        if (key === "夕方延長" && isPmNight) continue;

                        // Contiguity checks for logic safety
                        if (key === "早朝延長" && !hasAm && !isEffectiveAllday) continue;
                        if (key === "昼間延長" && !hasAm && !hasPm && !isEffectiveAllday) continue;
                        if (key === "夕方延長" && !hasPm && !hasNight && !isEffectiveAllday) continue;

                        extH += h;
                        const fee = extHourUnitPrice * h;
                        extDetails.push({ name: key, fee: fee });

                        if (key.includes('早朝')) segTotals.am += fee;
                        if (key.includes('昼間')) segTotals.pm += fee;
                        if (key.includes('夕方')) segTotals.night += fee;
                    }
                }
                const extTotal = extH * extHourUnitPrice;
                const basePlusExt = baseTotal + extTotal;

                if (roomName === '創作コーナー') {
                    roomTotal = baseTotal + extTotal;
                } else if (isEffectiveAllday) {
                    const mult = config.admissionMults.am;
                    roomTotal = Math.round(basePlusExt * mult);
                    if (mult > 1.0) roomSubDetails.push(`割増(全日): ¥${(roomTotal - basePlusExt).toLocaleString()}`);
                } else {
                    const amF = Math.round(segTotals.am * config.admissionMults.am);
                    const pmF = Math.round(segTotals.pm * config.admissionMults.pm);
                    const nightF = Math.round(segTotals.night * config.admissionMults.night);
                    roomTotal = amF + pmF + nightF;
                    if (config.admissionMults.am > 1.0 && segTotals.am > 0) roomSubDetails.push(`午前割増: ¥${(amF - segTotals.am).toLocaleString()}`);
                    if (config.admissionMults.pm > 1.0 && segTotals.pm > 0) roomSubDetails.push(`午後割増: ¥${(pmF - segTotals.pm).toLocaleString()}`);
                    if (config.admissionMults.night > 1.0 && segTotals.night > 0) roomSubDetails.push(`夜間割増: ¥${(nightF - segTotals.night).toLocaleString()}`);
                }
                if (roomTotal > 0) roomSubDetails.unshift(`基本+延長: ¥${basePlusExt.toLocaleString()}`);
                extDetails.forEach(ed => {
                    roomSubDetails.push(`${ed.name}: ¥${ed.fee.toLocaleString()}`);
                });
            }

            if (data.hasHvac) {
                const coolerRate = getPrice(roomName, 'coolerRate', data.coolerRate);
                const heaterRate = getPrice(roomName, 'heaterRate', data.heaterRate);
                const cT = config.hvac.cooler * coolerRate;
                const hT = config.hvac.heater * heaterRate;
                if (cT > 0) { roomTotal += cT; roomSubDetails.push(`冷房 ${config.hvac.cooler}h (¥${cT.toLocaleString()})`); }
                if (hT > 0) { roomTotal += hT; roomSubDetails.push(`暖房 ${config.hvac.heater}h (¥${hT.toLocaleString()})`); }
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
            if (roomEqCost > 0) roomSubDetails.push(`附属設備: ¥${roomEqCost.toLocaleString()}`);

            if (roomTotal > 0) {
                grandTotal += roomTotal;
                detailsHtml += `
                    <div class="flex flex-col text-sm mb-4 pb-4 border-b border-slate-100 last:border-0 animate-in slide-in-from-right-2 duration-300">
                        <div class="flex justify-between font-bold mb-1"><span class="text-primary">${roomName}</span><span>¥${roomTotal.toLocaleString()}</span></div>
                        <div class="text-[11px] text-slate-500 space-y-0.5">${roomSubDetails.map(d => `<div>・${d}</div>`).join('')}</div>
                    </div>
                `;
            }
        });

        simDetailsListEl.innerHTML = detailsHtml || '<div class="text-slate-400 text-center py-8">施設と条件を選択してください</div>';
        simTotalPriceEl.textContent = `¥${grandTotal.toLocaleString()}`;
        simTotalPriceEl.setAttribute('data-value', grandTotal);
    }

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

    // Initialize UI
    updateRoomButtonsUI();
    renderRoomConfigs();
    calculateTotal();
});
