export const salesUI = {
    renderSalesView(vehicles, clients) {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-gray-100">
                    <!-- Cabecera -->
                    <div class="p-8 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h2 class="text-3xl font-black uppercase tracking-tight">Nueva Venta</h2>
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Simulador de Crédito y Cierre de Operación</p>
                        </div>
                        <div class="hidden md:block">
                            <span class="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-blue-300 border border-white/10">Modo Pro</span>
                        </div>
                    </div>

                    <form id="formSale" class="p-8 space-y-8">
                        <!-- Sección 1: Selección Principal -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehículo *</label>
                                <div class="space-y-2">
                                    <div class="relative group">
                                        <input type="text" id="vehicleSearchInput" autocomplete="off" placeholder="FILTRAR POR MARCA, MODELO, AÑO O STOCK..." 
                                            class="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs uppercase appearance-none shadow-inner border border-slate-100">
                                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">🔍</span>
                                    </div>
                                    <select id="saleVehicle" required class="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm uppercase appearance-none shadow-inner">
                                        <option value="">-- SELECCIONE AUTO --</option>
                                        ${vehicles.map(v => `
                                            <option value="${v.id}" data-price="${v.precio_contado}" data-list="${v.precio_lista}" data-min-delivery="${v.entrega_minima || 0}" data-marca="${v.marca}" data-modelo="${v.modelo}" data-stock="${v.nro_stock || '---'}" data-anho="${v.anho}">
                                                STOCK ${v.nro_stock ? v.nro_stock.toString().padStart(5, '0') : '-----'} | ${v.marca} ${v.modelo} ${v.anho} - ${v.color || 'S/C'}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente *</label>
                                <div class="space-y-2">
                                    <div class="relative group">
                                        <input type="text" id="clientSearchInput" autocomplete="off" placeholder="BUSCAR POR NOMBRE O CI..." 
                                            class="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs uppercase appearance-none shadow-inner border border-slate-100">
                                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">🔍</span>
                                    </div>
                                    <div class="flex gap-2">
                                        <select id="saleClient" required class="flex-1 px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm uppercase appearance-none shadow-inner">
                                            <option value="">-- SELECCIONE CLIENTE --</option>
                                            ${clients.map(c => `<option value="${c.id}" data-name="${c.nombre}" data-doc="${c.nro_documento}">${c.nombre} (${c.nro_documento})</option>`).join('')}
                                        </select>
                                        <button type="button" id="btnQuickAddClient" class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold hover:bg-blue-100 transition-colors shadow-sm">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sección 2: Simulador Financiero -->
                        <div class="bg-gray-50 rounded-[2rem] p-8 space-y-8 border border-gray-100/50">
                            <!-- Tipo de Venta y Precio Base -->
                            <div class="flex flex-col md:flex-row gap-6">
                                <div class="flex-1 space-y-2">
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Operación</label>
                                    <div class="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <button type="button" data-val="contado" class="sale-type-btn flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                                            <i data-lucide="banknote" class="w-4 h-4"></i> Contado
                                        </button>
                                        <button type="button" data-val="financiado" class="sale-type-btn flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all text-slate-400 hover:bg-gray-50 flex items-center justify-center gap-2">
                                            <i data-lucide="calendar" class="w-4 h-4"></i> Financiado
                                        </button>
                                        <input type="hidden" name="tipo_venta" id="tipo_venta" value="contado">
                                    </div>
                                </div>
                                <div class="flex-1 space-y-2">
                                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio Negociado (Gs) *</label>
                                    <input type="text" id="total_venta" required class="w-full px-5 py-4 bg-white border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-800 text-xl shadow-sm text-center" placeholder="0">
                                </div>
                            </div>

                            <!-- Panel de Financiación -->
                            <div id="panelFinancing" class="hidden animate-in slide-in-from-top-4 duration-300 space-y-6 pt-6 border-t border-gray-200">
                                
                                <!-- Configuración Financiera -->
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega Inicial</label>
                                        <input type="text" id="entrega_inicial" class="w-full px-5 py-4 bg-white border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-center text-slate-700" placeholder="0">
                                    </div>
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Plazo (Meses)</label>
                                        <input type="number" id="cant_cuotas" min="1" max="60" value="12" class="w-full px-5 py-4 bg-white border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-center text-slate-700">
                                    </div>

                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Día Vencimiento</label>
                                        <input type="number" id="vencimiento_dia" min="1" max="31" value="${new Date().getDate()}" class="w-full px-5 py-4 bg-white border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-center text-slate-700">
                                    </div>
                                    
                                    <!-- Tasa de Interés -->
                                    <div class="space-y-2">
                                        <div class="flex justify-between items-center mb-1">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa (%)</label>
                                            <div class="flex bg-gray-200 rounded-lg p-0.5">
                                                <button type="button" id="rateTypeMensual" class="px-2 py-0.5 text-[9px] font-black uppercase rounded text-white bg-slate-600 shadow-sm transition-all">M</button>
                                                <button type="button" id="rateTypeAnual" class="px-2 py-0.5 text-[9px] font-black uppercase rounded text-slate-500 hover:text-slate-700 transition-all">A</button>
                                            </div>
                                            <input type="hidden" id="tasaTipo" value="mensual"> 
                                        </div>
                                        <input type="number" id="tasaInteres" step="0.1" value="0" class="w-full px-5 py-4 bg-white border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-center text-slate-700">
                                    </div>
                                </div>

                                <!-- Gestión de Refuerzos -->
                                <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                    <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refuerzos / Pagos Extra</label>
                                        <button type="button" id="btnAddReinforce" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition uppercase tracking-wider">+ Agregar</button>
                                    </div>
                                    <div id="reinforcementsContainer" class="space-y-3">
                                        <!-- Items de refuerzo se insertarán aquí -->
                                        <p id="noReinforceMsg" class="text-xs text-gray-300 text-center py-2 italic">Sin refuerzos programados</p>
                                    </div>
                                </div>

                                <!-- Resumen de Resultados -->
                                <div class="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 justify-between items-center">
                                    <div class="text-center md:text-left space-y-1">
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto a Financiar</p>
                                        <p class="text-xl font-bold text-slate-200" id="resSaldoFinanciar">0 Gs.</p>
                                    </div>
                                    <div class="text-center md:text-left space-y-1">
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intereses Totales</p>
                                        <p class="text-xl font-bold text-orange-400" id="resInteresTotal">0 Gs.</p>
                                    </div>
                                    <div class="text-center md:text-right bg-white/10 p-4 rounded-2xl w-full md:w-auto min-w-[200px] border border-white/10">
                                        <p class="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Cuota Mensual Estimada</p>
                                        <p class="text-3xl font-black tracking-tight" id="resCuotaMensual">0 Gs.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Acciones Finales -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <button type="button" id="btnGeneratePDF" class="px-6 py-5 bg-green-50 text-green-700 font-bold rounded-[1.5rem] hover:bg-green-100 transition-all active:scale-95 flex items-center justify-center gap-3 border border-green-100 uppercase tracking-wider text-xs shadow-sm">
                                <i data-lucide="file-text" class="w-5 h-5"></i>
                                <span>Generar Presupuesto (PDF)</span>
                            </button>
                            <button type="submit" id="btnFinalizeSale" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3">
                                <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                                <span>Finalizar Venta</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    // UI Helpers para evitar repetición
    setButtonLoading(btnId, isLoading, text = 'Procesando') {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.originalHTML = btn.innerHTML;
            btn.innerHTML = `<span class="flex items-center gap-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${text}...</span>`;
            if (window.lucide) lucide.createIcons();
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.originalHTML;
            if (window.lucide) lucide.createIcons();
        }
    },

    renderBudgetSuccessModal(pdfDoc, vehicleData, financialData) {
        const modalId = 'budgetSuccessModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        // Datos
        const stock = vehicleData.stock ? `#${vehicleData.stock}` : 'S/N';
        const title = `${vehicleData.marca} ${vehicleData.modelo}`;
        const cuota = financialData.cuota;
        const entrega = financialData.entrega;
        const plazo = financialData.plazo;

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                    <div class="bg-emerald-500 p-6 text-center">
                        <div class="mx-auto bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-3 backdrop-blur-md">
                            <i data-lucide="check-circle" class="w-8 h-8 text-white"></i>
                        </div>
                        <h3 class="text-white text-xl font-black uppercase tracking-tight">Presupuesto Listo</h3>
                        <p class="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">Simulación Generada</p>
                    </div>

                    <div class="p-8 space-y-6">
                        <!-- Resumen Visual -->
                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center space-y-1">
                            <span class="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-1 inline-block">STOCK ${stock}</span>
                            <h4 class="text-lg font-black text-slate-800">${title}</h4>
                            <div class="flex justify-center items-baseline gap-1 text-slate-600">
                                <span class="text-xs font-bold uppercase">Cuotas de</span>
                                <span class="text-2xl font-black text-emerald-600">${cuota} Gs.</span>
                            </div>
                        </div>

                        <!-- Acciones -->
                        <div class="space-y-3">
                            <button id="btnDownloadPDF" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition flex items-center justify-center gap-4 active:scale-[0.98]">
                                <i data-lucide="download" class="w-6 h-6 text-blue-400"></i>
                                <div class="text-left">
                                    <span class="block text-[10px] uppercase tracking-widest opacity-80 leading-none">Descargar</span>
                                    <span class="block text-sm font-black leading-none mt-1">ARCHIVO PDF</span>
                                </div>
                            </button>

                            <button id="btnShareWait" class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-2xl shadow-xl shadow-green-500/20 transition flex items-center justify-center gap-4 active:scale-[0.98]">
                                <i data-lucide="message-square" class="w-6 h-6"></i>
                                <div class="text-left">
                                    <span class="block text-[10px] uppercase tracking-widest opacity-80 leading-none">Enviar por</span>
                                    <span class="block text-sm font-black leading-none mt-1">WHATSAPP</span>
                                </div>
                            </button>
                        </div>

                        <button id="btnCloseBudget" class="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition">
                            Cerrar y Volver
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Eventos
        document.getElementById('btnDownloadPDF').onclick = () => {
            pdfDoc.save(`Presupuesto_${stock}_${vehicleData.modelo || 'AutoPlaya'}.pdf`);
        };

        document.getElementById('btnShareWait').onclick = () => {
            const msg = `Hola! Te adjunto el presupuesto de autoPlaya para el ${title} (${stock}).\n\nEntrega: ${entrega} Gs.\nSaldo en ${plazo} cuotas de ${cuota} Gs.\n\n¡Te esperamos para verlo!`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        };

        document.getElementById('btnCloseBudget').onclick = () => {
            document.getElementById(modalId).remove();
        };
    }
};
