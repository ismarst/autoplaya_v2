import { inventoryService } from './inventory/inventoryService.js';
import { inventoryUI } from './inventory/inventoryUI.js';
import { clientService } from './clients/clientService.js';
import { clientUI } from './clients/clientUI.js';
import { salesService } from './sales/salesService.js';
import { salesUI } from './sales/salesUI.js';
import { adminUI } from './admin/adminUI.js';
import { imageCompressor } from './utils/imageCompressor.js';
import { supabase } from './api/supabase.js';
import { notifier } from './utils/notifier.js';
import { formatDate } from './utils/dateFormatter.js';

import { collectionsUI } from './collections/collectionsUI.js';
import { reportsUI } from './reports/reportsUI.js';
import { historyUI } from './history/historyUI.js';
import { CONFIG } from './config.js';
import { tenantService } from './api/tenantService.js';

// --- UTILIDADES GLOBALES DE BÚSQUEDA ---
const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const fuzzyMatchModel = (item, searchStr) => {
    const query = normalizeStr(searchStr);
    if (!query) return true;

    const words = query.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return true;

    // Todas las palabras deben estar presentes en algún campo
    return words.every(word => {
        // Regla 1: Si son 4 dígitos exactos, solo buscar en AÑO
        if (!isNaN(word) && word.length === 4) {
            return item.anho.toString() === word;
        }

        // Regla 2: Si son 5 dígitos exactos, solo buscar en STOCK (pad con ceros)
        if (!isNaN(word) && word.length === 5) {
            const stockPadded = (item.nro_stock || '').toString().padStart(5, '0');
            return stockPadded === word;
        }

        // Regla 3: Otros términos (incluyendo stock corto pero ignorado por regla 2)
        // se buscan en Marca y Modelo
        const searchableText = normalizeStr(`${item.marca} ${item.modelo}`);
        return searchableText.includes(word);
    });
};

async function updateGlobalStats(playaId) {
    if (!playaId) return;
    try {
        const { count, error } = await supabase
            .from('vehiculos')
            .select('*', { count: 'exact', head: true })
            .eq('playa_id', playaId)
            .is('deleted_at', null)
            .neq('estado', 'vendido');

        if (error) throw error;

        const countEl = document.getElementById('vehicleCount');
        if (countEl) {
            countEl.textContent = `${count} Vehículos`;
            countEl.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error actualizando estadísticas:', err);
    }
}

async function init() {
    console.log('autoPlaya v2: Inicializando módulo de patio...');

    try {
        // 0. Identificar la Playa actual por Dominio (Tenant Identification)
        const currentPlaya = await tenantService.identify();
        if (!currentPlaya) {
            document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Error: Dominio no reconocido.</div>`;
            return;
        }

        // Marca Blanca: Actualizar Logo en Sidebar
        const sidebarLogo = document.getElementById('app-logo');
        if (sidebarLogo && currentPlaya.logo_url) {
            sidebarLogo.src = currentPlaya.logo_url;
            sidebarLogo.classList.remove('opacity-0');
        }

        // 1. Obtener Sesión (El Auth Guard del index.html ya verificó que existe)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 2. Cargar perfil completo incluyendo relación con Playa
        let { data: perfil, error: perError } = await supabase
            .from('perfiles')
            .select(`
                *,
                playas (nombre_comercial)
            `)
            .eq('id', session.user.id)
            .maybeSingle();

        if (perError || !perfil || perfil.playa_id !== tenantService.getPlayaId()) {
            // Desajuste de inquilino (Tenant Mismatch) - Expulsión forzada
            await supabase.auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        // 3. UI: Actualizar Perfil en Sidebar y verificar ROL ADMIN
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');

        if (nameEl) nameEl.textContent = perfil.nombre_completo || 'Usuario';
        if (roleEl) roleEl.textContent = perfil.rol === 'admin' ? 'Administrador' : 'Vendedor';
        if (avatarEl && perfil.nombre_completo) {
            const initials = perfil.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2);
            avatarEl.textContent = initials;
        }

        if (perfil.rol === 'admin') {
            document.getElementById('adminMenu').classList.remove('hidden');
        }

        // 4. Actualizar estadísticas globales desde el inicio
        await updateGlobalStats(perfil.playa_id);

        // 4. Lógica de Sidebar Mobile
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleSidebar = () => {
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            sidebar.classList.toggle('-translate-x-full', isOpen);
            overlay.classList.toggle('hidden', isOpen);
        };
        document.getElementById('btnToggleSidebar').onclick = toggleSidebar;
        document.getElementById('btnCloseSidebar').onclick = toggleSidebar;
        overlay.onclick = toggleSidebar;

        // 5. Configurar Logout
        document.getElementById('btnLogout').onclick = async () => {
            await supabase.auth.signOut();
            window.location.replace('login.html');
        };

        // 6. Navegación entre Secciones
        const showSection = async (section) => {
            // 1. Limpiar estado visual de navegación
            document.querySelectorAll('aside nav a').forEach(a => {
                a.classList.remove('sidebar-active');
                a.classList.add('text-gray-400');
            });

            // 2. Definir estados de sección
            const isInventory = section === 'inventory';
            const isClients = section === 'clients';
            const isSales = section === 'sales';
            const isCollections = section === 'collections';
            const isReports = section === 'reports';
            const isHistory = section === 'history';
            const isConfig = section === 'config';

            // 3. Limpiar Contenedor Principal con Loader
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="flex items-center justify-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            `;

            // 4. Control de visibilidad de herramientas de Header
            document.getElementById('filterLocal').classList.toggle('hidden', !isInventory);
            document.getElementById('searchVehicle').parentElement.classList.toggle('hidden', !isInventory);

            if (document.getElementById('vehicleCount')) {
                document.getElementById('vehicleCount').classList.toggle('hidden', !isInventory);
            }

            // 5. Configurar Botón Principal de Acción (Header)
            const mainActionBtn = document.getElementById('btnNewVehicle');
            mainActionBtn.classList.remove('hidden'); // Asegurar visibilidad por defecto
            mainActionBtn.onclick = null; // Reset

            // 6. Renderizar Sección Específica
            if (isInventory) {
                document.getElementById('navInventory').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Inventario';
                mainContent.innerHTML = `<div id="vehicleGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>`;

                mainActionBtn.innerHTML = `<i data-lucide="plus" class="w-4 h-4 mr-2"></i><span class="hidden md:block font-bold text-xs uppercase tracking-widest">Cargar Nuevo</span>`;
                initInventoryLogic();
                await loadInventory();

            } else if (isClients) {
                document.getElementById('navClients').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Clientes (CRM)';
                mainContent.innerHTML = `
                    <div class="mb-6 flex items-center gap-2">
                        <div class="relative flex-1 group">
                            <input type="text" id="searchClient" placeholder="BUSCAR POR NOMBRE O DOCUMENTO..."
                                class="w-full pl-9 pr-4 py-3 bg-white border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xs font-bold uppercase">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        </div>
                    </div>
                    <div id="clientGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>
                `;

                mainActionBtn.innerHTML = `<i data-lucide="user-plus" class="w-4 h-4 mr-2"></i><span class="hidden md:block font-bold text-xs uppercase tracking-widest">Nuevo Cliente</span>`;
                initClientsLogic();
                await loadClients();

            } else if (isSales) {
                document.getElementById('navSales').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Nueva Venta';

                mainActionBtn.innerHTML = `<i data-lucide="shopping-cart" class="w-4 h-4 mr-2"></i><span class="hidden md:block font-bold text-xs uppercase tracking-widest">Ventas</span>`;
                mainActionBtn.onclick = () => showSection('sales');

                await loadSalesSection();

            } else if (isCollections) {
                document.getElementById('navCollections').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Caja / Cobranzas';
                mainActionBtn.classList.add('hidden');

                mainContent.innerHTML = '';
                await collectionsUI.render(perfil.playa_id);

            } else if (isReports) {
                document.getElementById('navReports').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Dashboard Gerencial';
                mainActionBtn.classList.add('hidden');

                await reportsUI.render(perfil.playa_id);

            } else if (isHistory) {
                document.getElementById('navHistory').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Historial de Operaciones';
                mainActionBtn.classList.add('hidden');

                await historyUI.render(perfil.playa_id);

            } else if (isConfig && perfil.rol === 'admin') {
                document.getElementById('navConfig').classList.add('sidebar-active');
                document.getElementById('sectionTitle').textContent = 'Configuración';
                mainActionBtn.classList.add('hidden'); // Ocultar en config si no aplica
                await loadConfigModule();
            } else {
                mainActionBtn.classList.remove('hidden');
            }

            // Asegurar que el contador se actualice cada vez que entramos a una sección clave
            if (isInventory || isReports) {
                await updateGlobalStats(perfil.playa_id);
            }

            // Refrescar Lucide Icons
            if (window.lucide) lucide.createIcons();
        };

        // 7. Lógica del Inventario (Server-side Pagination & Filtering)
        let currentPage = 1;
        const pageSize = 12;

        const loadInventory = async (page = 1) => {
            currentPage = page;
            const searchTerm = document.getElementById('searchVehicle')?.value || '';
            const localId = document.getElementById('filterLocal')?.value || null;

            inventoryUI.renderSkeletons();

            try {
                const { data, totalRecords } = await inventoryService.getVehicles({
                    page: currentPage,
                    pageSize,
                    localId,
                    searchTerm: searchTerm.toUpperCase().trim()
                });

                const totalPages = Math.ceil(totalRecords / pageSize);

                inventoryUI.renderVehicleGrid(data, onVehicleClickAction, {
                    page: currentPage,
                    pageSize,
                    totalRecords,
                    totalPages,
                    onPageChange: (newPage) => loadInventory(newPage)
                });
            } catch (err) {
                console.error('Error cargando inventario:', err);
                notifier.showToast('Error al obtener datos', 'error');
            }
        };

        const initInventoryLogic = () => {
            document.getElementById('btnNewVehicle').onclick = async () => {
                const locals = await inventoryService.getLocals();
                inventoryUI.renderVehicleModal(locals);
                setupFormHandler(locals);
            };

            let searchTimeout;
            const searchInput = document.getElementById('searchVehicle');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    const val = e.target.value;
                    // No filtrar si solo hay espacios al final (permitir escribir frase)
                    if (val.length > 0 && val.endsWith(' ') && val.trim().length > 0) return;

                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => loadInventory(1), 300);
                };
            }

            const filterLocal = document.getElementById('filterLocal');
            if (filterLocal) {
                filterLocal.onchange = () => loadInventory(1);
            }
        };

        // --- LÓGICA CRM CLIENTES ---
        const loadClients = async () => {
            clientUI.renderSkeletons();
            const searchTerm = document.getElementById('searchClient')?.value || '';
            const clients = await clientService.getClients({ searchTerm });
            clientUI.renderClientGrid(clients, (client) => {
                const { form, btnDelete, closeModal } = clientUI.renderClientModal(client);

                btnDelete.onclick = async () => {
                    if (await notifier.confirm('Eliminar', '¿Seguro que deseas eliminar este cliente?')) {
                        await clientService.deleteClient(client.id);
                        notifier.showToast('Cliente eliminado');
                        closeModal();
                        loadClients();
                    }
                };

                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(new FormData(form).entries());
                    data.nombre = data.nombre.toUpperCase().trim();
                    data.nro_documento = data.nro_documento.toUpperCase().trim();
                    await clientService.updateClient(client.id, data);
                    notifier.showToast('Cliente actualizado');
                    closeModal();
                    loadClients();
                };
            });
        };

        const initClientsLogic = () => {
            document.getElementById('btnNewVehicle').onclick = () => {
                const { form, closeModal } = clientUI.renderClientModal();
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(new FormData(form).entries());
                    data.nombre = data.nombre.toUpperCase().trim();
                    data.nro_documento = data.nro_documento.toUpperCase().trim();
                    data.playa_id = perfil.playa_id;
                    await clientService.saveClient(data);
                    notifier.showToast('Cliente guardado');
                    closeModal();
                    loadClients();
                };
            };

            let searchTimeout;
            const searchInput = document.getElementById('searchClient');
            if (searchInput) {
                searchInput.oninput = () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(loadClients, 300);
                };
            }
        };

        // --- LÓGICA DE VENTAS ---
        const loadSalesSection = async () => {
            // Corrección CRÍTICA: La API devuelve { data, totalRecords }, no { vehicles }
            const { data: vehicles } = await inventoryService.getVehicles({ pageSize: 1000, estado: 'disponible' });
            const clients = await clientService.getClients();

            salesUI.renderSalesView(vehicles || [], clients || []);
            initSalesLogic();
        };

        const initSalesLogic = () => {
            const form = document.getElementById('formSale');
            const typeBtns = document.querySelectorAll('.sale-type-btn');
            const panelFinancing = document.getElementById('panelFinancing');
            const totalInput = document.getElementById('total_venta');
            const entregaInput = document.getElementById('entrega_inicial');
            const cuotasInput = document.getElementById('cant_cuotas');
            const vehicleSelect = document.getElementById('saleVehicle');
            const vehicleSearchInput = document.getElementById('vehicleSearchInput');

            // --- Lógica de Filtrado Fuzzy en Ventas ---
            if (vehicleSearchInput && vehicleSelect) {
                // Clonar opciones originales para tener la base completa
                const originalOptions = Array.from(vehicleSelect.options).slice(1); // Omitir placeholder

                vehicleSearchInput.oninput = (e) => {
                    const query = e.target.value;

                    // No limpiar/limitar si es solo un espacio al final
                    if (query.endsWith(' ') && query.trim().length > 0) return;

                    const filtered = originalOptions.filter(opt => {
                        const item = {
                            marca: opt.dataset.marca,
                            modelo: opt.dataset.modelo,
                            anho: opt.dataset.anho,
                            nro_stock: opt.dataset.stock
                        };
                        return fuzzyMatchModel(item, query);
                    });

                    // Reconstruir Select
                    const currentValue = vehicleSelect.value;
                    vehicleSelect.innerHTML = '<option value="">-- SELECCIONE AUTO --</option>';
                    filtered.forEach(opt => vehicleSelect.appendChild(opt.cloneNode(true)));

                    // Intentar restaurar valor si sigue estando en la lista
                    if (Array.from(vehicleSelect.options).some(o => o.value === currentValue)) {
                        vehicleSelect.value = currentValue;
                    }

                    // Forzar recálculo si el valor cambió o se perdió
                    vehicleSelect.dispatchEvent(new Event('change'));
                };
            }

            // --- Lógica de Filtrado de Clientes en Ventas ---
            const clientSelect = document.getElementById('saleClient');
            const clientSearchInput = document.getElementById('clientSearchInput');

            if (clientSearchInput && clientSelect) {
                // Clonar opciones originales (omitir placeholder)
                const originalClientOptions = Array.from(clientSelect.options).slice(1);

                clientSearchInput.oninput = (e) => {
                    const query = normalizeStr(e.target.value);

                    const filtered = originalClientOptions.filter(opt => {
                        const name = normalizeStr(opt.dataset.name || '');
                        const doc = normalizeStr(opt.dataset.doc || '');

                        // Coincidencia multipalabra (AND)
                        const words = query.split(/\s+/).filter(w => w.length > 0);
                        return words.every(word => name.includes(word) || doc.includes(word));
                    });

                    // Reconstruir Select
                    const currentValue = clientSelect.value;
                    clientSelect.innerHTML = '<option value="">-- SELECCIONE CLIENTE --</option>';
                    filtered.forEach(opt => clientSelect.appendChild(opt.cloneNode(true)));

                    if (Array.from(clientSelect.options).some(o => o.value === currentValue)) {
                        clientSelect.value = currentValue;
                    }
                };
            }

            [totalInput, entregaInput].forEach(input => {
                input.oninput = (e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val) val = parseInt(val).toLocaleString('es-PY');
                    e.target.value = val;
                    calculateQuotas();
                };
            });

            const calculateQuotas = () => {
                const tipo = document.getElementById('tipo_venta').value;
                if (tipo !== 'financiado') return;
                // Función reemplazada por updateFinancials en la nueva version
            };

            // --- NUEVA LÓGICA DE VENTAS CON SIMULADOR ---

            const tasaInput = document.getElementById('tasaInteres');
            const rateTypeMensual = document.getElementById('rateTypeMensual');
            const rateTypeAnual = document.getElementById('rateTypeAnual');
            const tasaInfo = document.getElementById('tasaInfo');
            const tasaTipo = document.getElementById('tasaTipo');

            // Estado Local de Refuerzos
            let reinforcements = [];

            // --- 1. Utilidades Financieras ---
            const parseMoney = (val) => parseInt(val.replace(/\D/g, "") || 0);
            const formatMoney = (val) => parseInt(val).toLocaleString('es-PY');

            const updateFinancials = () => {
                const tipo = document.getElementById('tipo_venta').value;
                if (tipo !== 'financiado') return;

                const precio = parseMoney(totalInput.value);
                const entrega = parseMoney(entregaInput.value);
                const plazo = parseInt(cuotasInput.value || 1);
                let tasa = parseFloat(tasaInput.value || 0);

                // Si es anual, convertir a mensual
                if (tasaTipo.value === 'anual') tasa = tasa / 12;

                // Calcular Total Refuerzos
                const totalRefuerzos = reinforcements.reduce((acc, r) => acc + r.amount, 0);

                // Lógica de Negocio (Fórmula Interés Directo)
                // 1. SaldoNeto = Precio - Entrega - Refuerzos
                const saldoNeto = Math.max(0, precio - entrega - totalRefuerzos);

                // 2. InterésTotal = SaldoNeto * (TasaMensual / 100) * Plazo
                const interesTotal = saldoNeto * (tasa / 100) * plazo;

                // 3. CuotaMensual = (SaldoNeto + InteresTotal) / Plazo
                const cuotaMensual = plazo > 0 ? (saldoNeto + interesTotal) / plazo : 0;

                // Actualizar UI
                document.getElementById('resSaldoFinanciar').textContent = formatMoney(saldoNeto) + " Gs.";
                document.getElementById('resInteresTotal').textContent = formatMoney(interesTotal) + " Gs.";
                document.getElementById('resCuotaMensual').textContent = formatMoney(cuotaMensual) + " Gs.";
            };

            // Helpers globales para eventos inline del render
            window.updateReinforceAmount = (idx, val) => {
                reinforcements[idx].amount = parseMoney(val);
                // No llamamos a renderReinforcements aquí para no perder el foco mientras escribe el monto si es posible,
                // pero como formateamos con formatMoney, es necesario re-renderizar al salir (onblur) o al cambiar.
                // Para simplificar y mantener coherencia con el diseño previo, seguimos re-renderizando.
                renderReinforcements();
                updateFinancials();
            };
            window.updateReinforceDate = (idx, val) => {
                reinforcements[idx].date = val;
                updateFinancials();
            };
            window.removeReinforce = (idx) => {
                reinforcements.splice(idx, 1);
                renderReinforcements();
                updateFinancials();
            };

            // --- 2. Event Listeners de Inputs ---
            [totalInput, entregaInput].forEach(input => {
                input.oninput = (e) => {
                    let val = parseMoney(e.target.value);
                    e.target.value = val ? formatMoney(val) : '';
                    updateFinancials();
                };
            });

            [cuotasInput, tasaInput, document.getElementById('vencimiento_dia')].forEach(input => {
                if (input) input.oninput = updateFinancials;
            });

            // --- 3. Selector de Vehículo ---
            vehicleSelect.onchange = () => {
                const opt = vehicleSelect.options[vehicleSelect.selectedIndex];
                if (opt && opt.value) {
                    const isContado = document.getElementById('tipo_venta').value === 'contado';
                    const price = isContado ? opt.dataset.price : opt.dataset.list;
                    const entregaMin = parseInt(opt.dataset.minDelivery || 0);

                    totalInput.value = formatMoney(price);

                    // Autopoblar entrega si está en modo financiado
                    if (!isContado && entregaMin > 0) {
                        entregaInput.value = formatMoney(entregaMin);
                    } else {
                        // Resetear a 0 si no hay entrega sugerida o es contado
                        entregaInput.value = '0';
                    }

                    updateFinancials();
                }
            };

            // --- 4. Toggle Tipo Tasa ---
            const toggleRate = (type) => {
                tasaTipo.value = type;
                if (type === 'mensual') {
                    rateTypeMensual.className = "px-2 py-0.5 text-[9px] font-black uppercase rounded text-white bg-slate-600 shadow-sm transition-all";
                    rateTypeAnual.className = "px-2 py-0.5 text-[9px] font-black uppercase rounded text-slate-500 hover:text-slate-700 transition-all";
                    if (tasaInfo) tasaInfo.textContent = "Tasa Mensual Directa";
                } else {
                    rateTypeAnual.className = "px-2 py-0.5 text-[9px] font-black uppercase rounded text-white bg-slate-600 shadow-sm transition-all";
                    rateTypeMensual.className = "px-2 py-0.5 text-[9px] font-black uppercase rounded text-slate-500 hover:text-slate-700 transition-all";
                    if (tasaInfo) tasaInfo.textContent = "Tasa Anual (Se divide por 12)";
                }
                updateFinancials();
            };
            rateTypeMensual.onclick = () => toggleRate('mensual');
            rateTypeAnual.onclick = () => toggleRate('anual');

            // --- 5. Gestión de Refuerzos ---
            const renderReinforcements = () => {
                const container = document.getElementById('reinforcementsContainer');
                if (reinforcements.length === 0) {
                    container.innerHTML = '<p class="text-xs text-gray-300 text-center py-2 italic">Sin refuerzos programados</p>';
                    return;
                }

                container.innerHTML = reinforcements.map((r, i) => `
                    <div class="flex flex-col md:flex-row gap-2 items-center bg-gray-50 p-3 rounded-2xl animate-in slide-in-from-left-2 duration-200 border border-gray-100">
                        <span class="text-[10px] font-black text-slate-400 w-6">#${i + 1}</span>
                        <div class="flex-1 flex gap-2 w-full">
                            <input type="text" value="${formatMoney(r.amount)}" 
                                placeholder="Monto"
                                class="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-center outline-none focus:border-blue-500 shadow-sm"
                                onchange="window.updateReinforceAmount(${i}, this.value)">
                            <input type="date" value="${r.date || ''}" 
                                class="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-center outline-none focus:border-blue-500 shadow-sm"
                                onchange="window.updateReinforceDate(${i}, this.value)">
                        </div>
                        <button type="button" onclick="window.removeReinforce(${i})" class="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                    </div>
                `).join('');
            };

            document.getElementById('btnAddReinforce').onclick = () => {
                reinforcements.push({ amount: 0, date: '' });
                renderReinforcements();
                updateFinancials();
            };

            // --- 6. Tipo de Venta (Contado/Financiado) ---
            typeBtns.forEach(btn => {
                btn.onclick = () => {
                    // Reset estilos
                    typeBtns.forEach(b => {
                        b.className = 'sale-type-btn flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all text-slate-400 hover:bg-gray-50';
                    });
                    // Activar actual
                    btn.className = 'sale-type-btn flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';

                    const val = btn.dataset.val;
                    document.getElementById('tipo_venta').value = val;
                    panelFinancing.classList.toggle('hidden', val !== 'financiado');

                    // Recalcular precio base según tipo
                    vehicleSelect.dispatchEvent(new Event('change'));
                };
            });

            // --- 7. Generación de PDF (Presupuesto) ---
            document.getElementById('btnGeneratePDF').onclick = async () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                const optVehicle = vehicleSelect.options[vehicleSelect.selectedIndex];
                const optClient = document.getElementById('saleClient').options[document.getElementById('saleClient').selectedIndex];

                if (!vehicleSelect.value) return notifier.showToast('Seleccione un vehículo', 'error');

                // Data
                const entrega = parseMoney(entregaInput.value);
                const precio = parseMoney(totalInput.value);
                const plazo = parseInt(cuotasInput.value);
                const saldo = parseMoney(document.getElementById('resSaldoFinanciar').textContent);
                const cuota = parseMoney(document.getElementById('resCuotaMensual').textContent);
                const totalRefuerzos = reinforcements.reduce((a, b) => a + b.amount, 0);

                // Header
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("PRESUPUESTO AUTO", 105, 20, null, null, "center");

                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text(`Fecha: ${formatDate(new Date())}`, 105, 30, null, null, "center");

                // Info Vehículo
                doc.autoTable({
                    startY: 40,
                    head: [['VEHÍCULO', 'CLIENTE']],
                    body: [[
                        `${optVehicle.dataset.marca} ${optVehicle.dataset.modelo}\nStock: #${optVehicle.dataset.stock}`,
                        `${optClient.text}`
                    ]],
                    theme: 'grid',
                    headStyles: { fillColor: [30, 41, 59] }
                });

                // Plan Financiero
                const planData = [
                    ['Precio Negociado', formatMoney(precio) + ' Gs.'],
                    ['Entrega Inicial', formatMoney(entrega) + ' Gs.'],
                    ['Refuerzos Totales', formatMoney(totalRefuerzos) + ' Gs.'],
                    ['Saldo a Financiar', formatMoney(saldo) + ' Gs.'],
                    ['Plazo', `${plazo} Meses`],
                    ['CUOTA MENSUAL', formatMoney(cuota) + ' Gs.']
                ];

                doc.autoTable({
                    startY: doc.lastAutoTable.finalY + 10,
                    head: [['CONCEPTO', 'MONTO']],
                    body: planData,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129] }, // Emerald Green
                    columnStyles: { 0: { fontStyle: 'bold' } }
                });

                // Detalles de Refuerzos si existen
                if (reinforcements.length > 0) {
                    doc.text("Plan de Refuerzos:", 14, doc.lastAutoTable.finalY + 15);
                    doc.autoTable({
                        startY: doc.lastAutoTable.finalY + 20,
                        head: [['#', 'MONTO', 'VENCIMIENTO']],
                        body: reinforcements.map((r, i) => [
                            `Refuerzo ${i + 1}`,
                            formatMoney(r.amount) + ' Gs.',
                            r.date ? formatDate(r.date) : '---'
                        ]),
                        theme: 'plain'
                    });
                }

                // NO Guardar directo, pasar al modal de éxito
                salesUI.renderBudgetSuccessModal(
                    doc,
                    {
                        marca: optVehicle.dataset.marca,
                        modelo: optVehicle.dataset.modelo,
                        stock: optVehicle.dataset.stock
                    },
                    {
                        cuota: formatMoney(cuota),
                        entrega: formatMoney(entrega),
                        plazo: plazo
                    }
                );
            };

            // --- 9. Cliente Rápido ---
            const btnQuickClient = document.getElementById('btnQuickAddClient');
            if (btnQuickClient) {
                btnQuickClient.onclick = () => {
                    const { form: cForm, closeModal } = clientUI.renderClientModal();
                    cForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const d = Object.fromEntries(new FormData(cForm).entries());
                        // Asegurar campos obligatorios
                        d.playa_id = perfil.playa_id;
                        d.nombre = d.nombre.toUpperCase();

                        try {
                            const nc = await clientService.saveClient(d);
                            notifier.showToast('Cliente registrado con éxito');
                            closeModal();

                            // Recargar combo clientes y seleccionar el nuevo
                            const clients = await clientService.getClients();
                            const sel = document.getElementById('saleClient');

                            sel.innerHTML = '<option value="">-- SELECCIONE CLIENTE --</option>' +
                                clients.map(c => `<option value="${c.id}" data-name="${c.nombre}" data-doc="${c.nro_documento}">${c.nombre} (${c.nro_documento})</option>`).join('');

                            sel.value = nc.id; // Auto-seleccionar
                        } catch (err) {
                            console.error(err);
                            notifier.showToast('Error al registrar cliente: ' + err.message, 'error');
                        }
                    };
                };
            }

            // --- 8. Finalizar Venta ---
            form.onsubmit = async (e) => {
                e.preventDefault();

                // Validaciones de negocio
                if (!vehicleSelect.value) return notifier.showToast('Seleccione un vehículo', 'error');
                if (!document.getElementById('saleClient').value) return notifier.showToast('Seleccione un cliente', 'error');

                const tipoVenta = document.getElementById('tipo_venta').value;
                const totalVenta = parseMoney(totalInput.value);
                const entregaVenta = parseMoney(entregaInput.value);
                const cantCuotas = parseInt(cuotasInput.value || 0);

                if (totalVenta <= 0) return notifier.showToast('El monto total debe ser mayor a cero', 'error');
                if (tipoVenta === 'financiado' && cantCuotas < 1) return notifier.showToast('Ingrese la cantidad de cuotas (mínimo 1)', 'error');
                if (tipoVenta === 'financiado' && entregaVenta >= totalVenta) return notifier.showToast('La entrega inicial no puede igualar o superar el total', 'error');

                if (!confirm('¿CONFIRMAR VENTA? Esta acción es irreversible.')) return;

                salesUI.setButtonLoading('btnFinalizeSale', true);

                try {
                    const saleData = {
                        playa_id: perfil.playa_id,
                        vehiculo_id: vehicleSelect.value,
                        cliente_id: document.getElementById('saleClient').value,
                        tipo_venta: document.getElementById('tipo_venta').value,
                        total_venta: parseMoney(totalInput.value),
                        entrega_inicial: parseMoney(entregaInput.value),
                        vendedor_id: session.user.id
                    };

                    let qts = [];
                    if (saleData.tipo_venta === 'financiado') {
                        const n = parseInt(cuotasInput.value);
                        const m = parseMoney(document.getElementById('resCuotaMensual').textContent);
                        const dueDay = parseInt(document.getElementById('vencimiento_dia')?.value || new Date().getDate());

                        // Generar Cuotas Regulares
                        for (let i = 1; i <= n; i++) {
                            let d = new Date();
                            // Sumamos i meses
                            d.setMonth(d.getMonth() + i);
                            // Ajustamos al día seleccionado
                            d.setDate(dueDay);

                            qts.push({
                                nro_cuota: i,
                                monto: m,
                                fecha_vencimiento: d.toISOString().split('T')[0],
                                es_refuerzo: false
                            });
                        }

                        // Generar Cuotas de Refuerzo
                        reinforcements.forEach((r, idx) => {
                            if (!r.date || r.date === '') {
                                throw new Error(`Debe asignar una fecha al Refuerzo #${idx + 1}`);
                            }
                            qts.push({
                                nro_cuota: 0, // 0 indica refuerzo/especial
                                monto: r.amount,
                                fecha_vencimiento: r.date,
                                es_refuerzo: true,
                                estado: 'pendiente'
                            });
                        });
                    }

                    await salesService.processSale(saleData, qts);
                    notifier.showToast('¡Venta Exitosa! 🚗💨');
                    showSection('inventory'); // Volver al inventario

                } catch (err) {
                    console.error(err);
                    notifier.showToast(err.message || 'Error al procesar venta', 'error');
                } finally {
                    salesUI.setButtonLoading('btnFinalizeSale', false, 'Finalizar Venta');
                }
            };
        };

        // Eliminado loadInventory duplicado

        // 8. Cargar Locales Dinámicamente
        const loadLocals = async () => {
            const locals = await inventoryService.getLocals();
            const filterSelect = document.getElementById('filterLocal');
            filterSelect.innerHTML = '<option value="">Todos los Locales</option>' +
                locals.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
        };

        // 9. Módulo de Configuración (Admin Only)
        const loadConfigModule = async () => {
            const locals = await inventoryService.getLocals();
            adminUI.renderLocalsTable(
                locals,
                async (id, data) => {
                    // id es null cuando es un nuevo local
                    try {
                        if (id) {
                            await inventoryService.updateLocal(id, data);
                            notifier.showToast('Cambios guardados en la sucursal');
                        } else {
                            await inventoryService.saveLocal({ ...data, playa_id: perfil.playa_id });
                            notifier.showToast('Nueva sucursal registrada con éxito');
                        }
                        loadConfigModule();
                        loadLocals();
                    } catch (err) {
                        notifier.showToast('Error al guardar local: ' + err.message, 'error');
                    }
                },
                async (id) => {
                    try {
                        await inventoryService.deleteLocal(id);
                        notifier.showToast('Sucursal eliminada');
                        loadConfigModule();
                        loadLocals();
                    } catch (err) {
                        notifier.showToast('Error al eliminar: ' + err.message, 'error');
                    }
                }
            );
        };

        // 10. Handlers y Eventos de Clic en Tarjeta
        const onVehicleClickAction = async (v) => {
            inventoryUI.renderVehicleDetailModal(v, async (vEdit) => {
                const ls = await inventoryService.getLocals();
                inventoryUI.renderVehicleModal(ls, vEdit);
                setupFormHandler(ls, vEdit);
            }, async (vDel) => {
                if (await notifier.confirm('Confirmar', `¿Borrar STOCK #${vDel.nro_stock.toString().padStart(5, '0')}?`)) {
                    await inventoryService.deleteVehicle(vDel.id);
                    notifier.showToast('Eliminado');
                    document.getElementById('modalDetail')?.remove();
                    await loadInventory();
                }
            });

            // Acción Iniciar Venta desde Detalle
            const btnSale = document.getElementById('btnStartSale');
            if (btnSale) {
                btnSale.onclick = async () => {
                    // 1. Cerrar modal de detalle
                    const modal = document.getElementById('modalDetail');
                    if (modal) modal.remove();

                    // 2. Navegar a ventas
                    await showSection('sales');

                    // 3. Pre-seleccionar vehículo (con delay para UI)
                    setTimeout(() => {
                        const sel = document.getElementById('saleVehicle');
                        if (sel) {
                            // Si tiene entrega mínima, cambiar a modo financiado automáticamente
                            if (v.entrega_minima > 0) {
                                const btnFinancing = document.querySelector('button[data-val="financiado"]');
                                if (btnFinancing) btnFinancing.click();
                            }
                            sel.value = v.id;
                            sel.dispatchEvent(new Event('change'));
                        }
                    }, 500);
                };
            }
        };

        const setupFormHandler = (locals, vehicleToEdit = null) => {
            const form = document.getElementById('formVehicle');
            form.onsubmit = async (e) => {
                e.preventDefault();
                inventoryUI.setLoading(true);
                try {
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());

                    // Sanitización
                    ['marca', 'modelo', 'color', 'chapa', 'nro_chasis', 'descripcion'].forEach(f => {
                        if (data[f]) {
                            data[f] = data[f].toUpperCase().trim();
                        } else {
                            data[f] = null; // Convertir vacíos en NULL para evitar conflictos
                        }
                    });
                    data.precio_contado = parseInt(data.precio_contado.replace(/\D/g, "")) || 0;
                    data.precio_lista = parseInt(data.precio_lista.replace(/\D/g, "")) || 0;
                    data.entrega_minima = parseInt(data.entrega_minima.replace(/\D/g, "")) || 0;
                    data.playa_id = perfil.playa_id;

                    // Fotos
                    const existing = Array.from(document.querySelectorAll('#photoContainer > div[data-url]')).map(d => d.getAttribute('data-url'));
                    const newDivs = Array.from(document.querySelectorAll('#photoContainer > .photo-item')).filter(d => d.fileObj);
                    const newUrls = [];
                    for (const d of newDivs) {
                        const comp = await imageCompressor.compress(d.fileObj);
                        newUrls.push(await inventoryService.uploadVehiclePhoto(comp, perfil.playa_id));
                    }
                    data.fotos = [...existing, ...newUrls];

                    if (vehicleToEdit) {
                        await inventoryService.updateVehicle(vehicleToEdit.id, data);
                        notifier.showToast('Actualizado');
                    } else {
                        await inventoryService.saveVehicle(data);
                        notifier.showToast('Guardado');
                    }
                    document.getElementById('closeModal').click();
                    await loadInventory();
                } catch (err) { notifier.showToast(err.message || 'Error inesperado al guardar', 'error'); }
                finally { inventoryUI.setLoading(false); }
            };
        };

        // Inicialización
        document.getElementById('navInventory').onclick = () => showSection('inventory');
        document.getElementById('navClients').onclick = () => showSection('clients');
        document.getElementById('navSales').onclick = () => showSection('sales');
        document.getElementById('navCollections').onclick = () => showSection('collections');
        document.getElementById('navHistory').onclick = () => showSection('history');
        document.getElementById('navReports').onclick = () => showSection('reports');
        document.getElementById('navConfig').onclick = () => showSection('config');

        await loadLocals();
        await showSection('reports');

    } catch (error) { console.error(error); }
}

document.addEventListener('DOMContentLoaded', init);
