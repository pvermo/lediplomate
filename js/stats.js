/**
 * Gestion des statistiques améliorées pour l'application CigarManager
 * Version 2.0 - Interface à onglets, filtres avancés, visualisations riches et export amélioré
 */

class StatsManager {
    constructor() {
        // Éléments DOM de base
        this.statsPeriod = document.getElementById('statsPeriod');
        this.customDateRange = document.getElementById('customDateRange');
        this.statsStartDate = document.getElementById('statsStartDate');
        this.statsEndDate = document.getElementById('statsEndDate');
        this.totalSales = document.getElementById('totalSales');
        this.salesCount = document.getElementById('salesCount');
        this.cigarsSold = document.getElementById('cigarsSold');
        this.exportStatsBtn = document.getElementById('exportStatsBtn');
        
        // Nouveaux éléments DOM pour l'interface à onglets
        this.tabsContainer = document.getElementById('statsTabs') || this.createTabsContainer();
        this.tabContents = document.getElementById('statsTabContents') || this.createTabContents();
        
        // Nouveaux éléments DOM pour les filtres avancés
        this.filtersContainer = document.getElementById('statsFilters') || this.createFiltersContainer();
        this.supplierFilter = document.getElementById('statsSupplierFilter');
        this.countryFilter = document.getElementById('statsCountryFilter');
        this.brandFilter = document.getElementById('statsBrandFilter');
        this.compareWithPreviousPeriod = document.getElementById('comparePreviousPeriod');
        
        // Éléments pour les tendances
        this.totalSalesChange = document.getElementById('totalSalesChange');
        this.salesCountChange = document.getElementById('salesCountChange');
        this.cigarsSoldChange = document.getElementById('cigarsSoldChange');
        
        // Charts
        this.charts = {};
        
        // État
        this.salesData = [];
        this.startDate = null;
        this.endDate = null;
        this.previousPeriodData = {
            salesData: [],
            startDate: null,
            endDate: null
        };
        this.activeTab = 'overview';
        this.filters = {
            supplier: 'all',
            country: 'all',
            brand: 'all',
            compareWithPrevious: false
        };
        
        // Options de configuration
        this.config = {
            topProductsLimit: 10,
            defaultChartHeight: 300
        };
        
        // Palettes de couleurs
        this.colorPalettes = {
            primary: [
                'rgba(54, 162, 235, 0.6)',  // Bleu
                'rgba(255, 99, 132, 0.6)',  // Rouge
                'rgba(75, 192, 192, 0.6)',  // Vert turquoise
                'rgba(255, 206, 86, 0.6)',  // Jaune
                'rgba(153, 102, 255, 0.6)', // Violet
                'rgba(255, 159, 64, 0.6)',  // Orange
                'rgba(201, 203, 207, 0.6)', // Gris
                'rgba(83, 102, 255, 0.6)',  // Bleu indigo
                'rgba(255, 99, 255, 0.6)',  // Rose
                'rgba(99, 255, 132, 0.6)'   // Vert clair
            ],
            brands: [
                'rgba(85, 110, 230, 0.7)',  // Bleu
                'rgba(217, 83, 79, 0.7)',   // Rouge
                'rgba(59, 201, 219, 0.7)',  // Turquoise
                'rgba(240, 173, 78, 0.7)',  // Orange
                'rgba(130, 76, 203, 0.7)',  // Violet
                'rgba(92, 184, 92, 0.7)',   // Vert
                'rgba(240, 113, 36, 0.7)',  // Orange foncé
                'rgba(79, 129, 189, 0.7)',  // Bleu clair
                'rgba(192, 80, 77, 0.7)',   // Rouge foncé
                'rgba(155, 187, 89, 0.7)'   // Vert clair
            ],
            countries: [
                'rgba(182, 53, 53, 0.7)',   // Rouge - Cuba
                'rgba(76, 114, 176, 0.7)',  // Bleu - République Dominicaine
                'rgba(109, 152, 77, 0.7)',  // Vert - Nicaragua
                'rgba(189, 135, 52, 0.7)',  // Orange - Honduras
                'rgba(130, 76, 203, 0.7)',  // Violet - Costa Rica
                'rgba(59, 161, 219, 0.7)',  // Bleu clair - Équateur
                'rgba(213, 95, 48, 0.7)',   // Orange foncé - Mexique
                'rgba(123, 172, 87, 0.7)',  // Vert clair - Brésil
                'rgba(165, 109, 186, 0.7)', // Mauve - Panama
                'rgba(201, 117, 56, 0.7)'   // Brun - Autres
            ]
        };
        
        // Initialiser les événements
        this.initEventListeners();
    }
    
    /**
     * Crée le conteneur d'onglets s'il n'existe pas
     * @returns {HTMLElement} - Conteneur d'onglets
     */
    createTabsContainer() {
        // Créer le conteneur d'onglets
        const tabsContainer = document.createElement('div');
        tabsContainer.id = 'statsTabs';
        tabsContainer.className = 'nav nav-tabs analysis-tabs';
        
        // Créer les onglets
        const tabs = [
            { id: 'overview', label: 'Vue d\'ensemble', icon: 'fas fa-chart-pie' },
            { id: 'products', label: 'Produits', icon: 'fas fa-box' },
            { id: 'suppliers', label: 'Fournisseurs', icon: 'fas fa-truck' },
            { id: 'trends', label: 'Tendances', icon: 'fas fa-chart-line' }
        ];
        
        tabs.forEach((tab, index) => {
            const tabElement = document.createElement('li');
            tabElement.className = 'nav-item';
            
            const tabLink = document.createElement('a');
            tabLink.className = `nav-link ${index === 0 ? 'active' : ''}`;
            tabLink.href = '#';
            tabLink.dataset.tab = tab.id;
            tabLink.innerHTML = `<i class="${tab.icon} me-2"></i>${tab.label}`;
            
            tabElement.appendChild(tabLink);
            tabsContainer.appendChild(tabElement);
        });
        
        // Insérer le conteneur d'onglets avant les statistiques
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            statsContainer.parentNode.insertBefore(tabsContainer, statsContainer);
        }
        
        return tabsContainer;
    }
    
    /**
     * Crée le conteneur de contenu des onglets s'il n'existe pas
     * @returns {HTMLElement} - Conteneur de contenu des onglets
     */
    createTabContents() {
        // Créer le conteneur de contenu des onglets
        const tabContents = document.createElement('div');
        tabContents.id = 'statsTabContents';
        tabContents.className = 'tab-contents';
        
        // Créer le contenu de chaque onglet
        const tabs = [
            { id: 'overview', title: 'Aperçu général' },
            { id: 'products', title: 'Analyse par produit' },
            { id: 'suppliers', title: 'Analyse par fournisseur' },
            { id: 'trends', title: 'Tendances et évolutions' }
        ];
        
        tabs.forEach((tab, index) => {
            const tabContent = document.createElement('div');
            tabContent.id = `stats-tab-${tab.id}`;
            tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
            
            // Structure de base pour chaque onglet
            tabContent.innerHTML = `
                <h4 class="mt-3">${tab.title}</h4>
                <div id="${tab.id}-stats-container" class="mt-3">
                    <!-- Contenu dynamique -->
                </div>
            `;
            
            tabContents.appendChild(tabContent);
        });
        
        // Insérer le conteneur de contenu après les métriques générales
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            statsContainer.appendChild(tabContents);
        }
        
        return tabContents;
    }
    
    /**
     * Crée le conteneur de filtres s'il n'existe pas
     * @returns {HTMLElement} - Conteneur de filtres
     */
    createFiltersContainer() {
        // Créer le conteneur de filtres
        const filtersContainer = document.createElement('div');
        filtersContainer.id = 'statsFilters';
        filtersContainer.className = 'filters-container mt-3 mb-4 p-3 bg-light rounded';
        
        // Structure HTML des filtres
        filtersContainer.innerHTML = `
            <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                <div class="d-flex flex-wrap gap-2">
                    <select id="statsSupplierFilter" class="form-select form-select-sm" style="width: auto;">
                        <option value="all">Tous les fournisseurs</option>
                    </select>
                    <select id="statsCountryFilter" class="form-select form-select-sm" style="width: auto;">
                        <option value="all">Tous les pays</option>
                    </select>
                    <select id="statsBrandFilter" class="form-select form-select-sm" style="width: auto;">
                        <option value="all">Toutes les marques</option>
                    </select>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="comparePreviousPeriod">
                    <label class="form-check-label" for="comparePreviousPeriod">Comparer avec période précédente</label>
                </div>
            </div>
        `;
        
        // Insérer le conteneur de filtres après la sélection de période
        const filterContainer = document.querySelector('.filter-container');
        if (filterContainer) {
            filterContainer.parentNode.insertBefore(filtersContainer, filterContainer.nextSibling);
        }
        
        return filtersContainer;
    }
    
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        // Période de statistiques
        this.statsPeriod.addEventListener('change', () => {
            if (this.statsPeriod.value === 'custom') {
                this.customDateRange.style.display = 'flex';
            } else {
                this.customDateRange.style.display = 'none';
                this.loadStats();
            }
        });
        
        // Dates personnalisées
        this.statsStartDate.addEventListener('change', () => this.loadStats());
        this.statsEndDate.addEventListener('change', () => this.loadStats());
        
        // Export Excel
        this.exportStatsBtn.addEventListener('click', () => this.exportStats());
        
        // Onglets de navigation
        const tabLinks = this.tabsContainer.querySelectorAll('.nav-link');
        tabLinks.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Supprimer la classe active de tous les onglets
                tabLinks.forEach(t => t.classList.remove('active'));
                
                // Ajouter la classe active à l'onglet cliqué
                tab.classList.add('active');
                
                // Définir l'onglet actif
                this.activeTab = tab.dataset.tab;
                
                // Afficher le contenu de l'onglet
                this.showTabContent(this.activeTab);
                
                // Générer les graphiques de l'onglet
                this.generateTabCharts(this.activeTab);
            });
        });
        
        // Filtres
        if (this.supplierFilter) {
            this.supplierFilter.addEventListener('change', () => {
                this.filters.supplier = this.supplierFilter.value;
                this.applyFilters();
            });
        }
        
        if (this.countryFilter) {
            this.countryFilter.addEventListener('change', () => {
                this.filters.country = this.countryFilter.value;
                this.applyFilters();
            });
        }
        
        if (this.brandFilter) {
            this.brandFilter.addEventListener('change', () => {
                this.filters.brand = this.brandFilter.value;
                this.applyFilters();
            });
        }
        
        if (this.compareWithPreviousPeriod) {
            this.compareWithPreviousPeriod.addEventListener('change', () => {
                this.filters.compareWithPrevious = this.compareWithPreviousPeriod.checked;
                if (this.filters.compareWithPrevious) {
                    this.loadPreviousPeriodData();
                } else {
                    this.applyFilters();
                }
            });
        }
    }
    
    /**
     * Affiche le contenu de l'onglet spécifié
     * @param {string} tabId - ID de l'onglet à afficher
     */
    showTabContent(tabId) {
        // Masquer tous les contenus d'onglet
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
        
        // Afficher le contenu de l'onglet spécifié
        const activeContent = document.getElementById(`stats-tab-${tabId}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }
    }
    
    /**
     * Génère les graphiques pour l'onglet spécifié
     * @param {string} tabId - ID de l'onglet
     */
    generateTabCharts(tabId) {
            Object.keys(this.charts).forEach(key => {
                if (this.charts[key]) {
                    this.charts[key].destroy();
                    delete this.charts[key];
                }
            });
        switch (tabId) {
            case 'overview':
                this.renderOverviewTab();
                break;
            case 'products':
                this.renderProductsTab();
                break;
            case 'suppliers':
                this.renderSuppliersTab();
                break;
            case 'trends':
                this.renderTrendsTab();
                break;
        }
    }
    
    /**
     * Charge les statistiques selon la période sélectionnée
     */
    async loadStats() {
        try {
            // Masquer tous les onglets pendant le chargement
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            
            // Afficher un indicateur de chargement
            this.showLoadingIndicator();
            
            // Déterminer les dates de début et fin
            this.calculateDateRange();
            
            // Charger les ventes pour la période
            this.salesData = await this.getSalesForPeriod(this.startDate, this.endDate);
            
            // Mettre à jour les listes de filtres
            this.updateFilterLists();
            
            // Calculer et afficher les statistiques
            this.calculateAndDisplayStats();
            
            // Générer les graphiques pour l'onglet actif
            await this.generateTabCharts(this.activeTab);
            
            // Afficher le contenu de l'onglet actif
            this.showTabContent(this.activeTab);
            
            // Masquer l'indicateur de chargement
            this.hideLoadingIndicator();
            
            // Si la comparaison avec la période précédente est activée, charger les données
            if (this.filters.compareWithPrevious) {
                this.loadPreviousPeriodData();
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            alert('Erreur lors du chargement des statistiques.');
            this.hideLoadingIndicator();
        }
    }
    
    /**
     * Affiche un indicateur de chargement
     */
    showLoadingIndicator() {
        // Créer l'indicateur s'il n'existe pas
        if (!document.getElementById('statsLoadingIndicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'statsLoadingIndicator';
            loadingIndicator.className = 'text-center py-5';
            loadingIndicator.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des statistiques...</p>
            `;
            
            const statsContainer = document.querySelector('.stats-container');
            if (statsContainer) {
                statsContainer.appendChild(loadingIndicator);
            }
        } else {
            document.getElementById('statsLoadingIndicator').style.display = 'block';
        }
    }
    
    /**
     * Masque l'indicateur de chargement
     */
    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('statsLoadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Calcule la plage de dates selon la période sélectionnée
     */
    calculateDateRange() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.statsPeriod.value) {
            case 'day':
                this.startDate = today;
                this.endDate = new Date(today);
                this.endDate.setDate(this.endDate.getDate() + 1);
                break;
                
            case 'week':
                this.startDate = new Date(today);
                this.startDate.setDate(this.startDate.getDate() - this.startDate.getDay());
                this.endDate = new Date(this.startDate);
                this.endDate.setDate(this.endDate.getDate() + 7);
                break;
                
            case 'month':
                this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.endDate.setDate(this.endDate.getDate() + 1);
                break;
                
            case 'year':
                this.startDate = new Date(today.getFullYear(), 0, 1);
                this.endDate = new Date(today.getFullYear() + 1, 0, 0);
                break;
                
            case 'custom':
                const startDate = this.statsStartDate.value;
                const endDate = this.statsEndDate.value;
                
                if (startDate && endDate) {
                    this.startDate = new Date(startDate);
                    // Ajouter un jour à la fin pour inclure cette journée complète
                    this.endDate = new Date(endDate);
                    this.endDate.setDate(this.endDate.getDate() + 1);
                } else {
                    // Par défaut, utiliser le mois en cours
                    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    this.endDate.setDate(this.endDate.getDate() + 1);
                }
                break;
                
            default:
                // Par défaut, utiliser le mois en cours
                this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.endDate.setDate(this.endDate.getDate() + 1);
        }
    }
    
    /**
     * Charge les données de la période précédente pour comparaison
     */
    async loadPreviousPeriodData() {
        try {
            // Calculer les dates de la période précédente
            const previousPeriod = this.calculatePreviousPeriodDates();
            this.previousPeriodData.startDate = previousPeriod.startDate;
            this.previousPeriodData.endDate = previousPeriod.endDate;
            
            // Charger les ventes pour la période précédente
            this.previousPeriodData.salesData = await this.getSalesForPeriod(
                previousPeriod.startDate,
                previousPeriod.endDate
            );
            
            // Mettre à jour l'affichage avec les comparaisons
            this.updateComparisonStats();
            
            // Mettre à jour les graphiques avec les données de comparaison
            this.applyFilters();
            
        } catch (error) {
            console.error('Erreur lors du chargement des données de comparaison:', error);
            alert('Erreur lors du chargement des données de comparaison.');
        }
    }
    
    /**
     * Calcule les dates de la période précédente en fonction de la période actuelle
     * @returns {Object} - Dates de début et de fin de la période précédente
     */
    calculatePreviousPeriodDates() {
        // Calculer la durée de la période actuelle en millisecondes
        const currentPeriodDuration = this.endDate.getTime() - this.startDate.getTime();
        
        // Calculer les dates de la période précédente
        const previousEndDate = new Date(this.startDate);
        const previousStartDate = new Date(this.startDate);
        previousStartDate.setTime(previousStartDate.getTime() - currentPeriodDuration);
        
        return {
            startDate: previousStartDate,
            endDate: previousEndDate
        };
    }
    
    /**
     * Récupère les ventes pour la période spécifiée
     * @param {Date} startDate - Date de début
     * @param {Date} endDate - Date de fin
     * @returns {Promise<Array>} - Promesse contenant les ventes de la période
     */
    async getSalesForPeriod(startDate, endDate) {
        if (!startDate || !endDate) {
            return [];
        }
        
        return await dbManager.getSalesByDateRange(startDate, endDate);
    }
    
    /**
     * Met à jour les listes de filtres avec les données disponibles
     */
    async updateFilterLists() {
        try {
            // Récupérer tous les produits pour avoir les informations complètes
            const allProducts = await dbManager.getAllProducts();
            
            // Extraire les fournisseurs, pays et marques uniques
            const suppliers = new Set();
            const countries = new Set();
            const brands = new Set();
            
            allProducts.forEach(product => {
                if (product.supplier) suppliers.add(product.supplier);
                if (product.country) countries.add(product.country);
                if (product.brand) brands.add(product.brand);
            });
            
            // Mettre à jour le filtre de fournisseur
            this.updateFilterOptions(this.supplierFilter, suppliers);
            
            // Mettre à jour le filtre de pays
            this.updateFilterOptions(this.countryFilter, countries);
            
            // Mettre à jour le filtre de marque
            this.updateFilterOptions(this.brandFilter, brands);
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour des filtres:', error);
        }
    }
    
    /**
     * Met à jour les options d'un sélecteur de filtre
     * @param {HTMLSelectElement} selectElement - Élément select à mettre à jour
     * @param {Set} values - Ensemble des valeurs à ajouter
     */
    updateFilterOptions(selectElement, values) {
        if (!selectElement) return;
        
        // Sauvegarder la valeur actuelle
        const currentValue = selectElement.value;
        
        // Vider le select sauf la première option
        selectElement.innerHTML = selectElement.options[0].outerHTML;
        
        // Ajouter les nouvelles options triées
        [...values].sort().forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectElement.appendChild(option);
        });
        
        // Restaurer la valeur sélectionnée si elle existe toujours
        if ([...values].includes(currentValue)) {
            selectElement.value = currentValue;
        } else {
            selectElement.value = 'all';
            this.filters.supplier = 'all';
            this.filters.country = 'all';
            this.filters.brand = 'all';
        }
    }
    
    /**
     * Calcule et affiche les statistiques globales
     */
    calculateAndDisplayStats() {
        // Réinitialiser les statistiques
        let totalAmount = 0;
        let totalItems = 0;
        
        // Calculer les totaux
        this.salesData.forEach(sale => {
            totalAmount += sale.total || 0;
            
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    totalItems += item.quantity || 0;
                });
            }
        });
        
        // Afficher les statistiques
        this.totalSales.textContent = `${totalAmount.toFixed(2)} €`;
        this.salesCount.textContent = this.salesData.length;
        this.cigarsSold.textContent = totalItems;
    }
    
    /**
     * Met à jour les statistiques de comparaison
     */
    updateComparisonStats() {
        if (!this.filters.compareWithPrevious || !this.previousPeriodData.salesData) {
            return;
        }
        
        // Calculer les totaux de la période actuelle
        let currentTotalAmount = 0;
        let currentTotalItems = 0;
        let currentSalesCount = this.salesData.length;
        
        this.salesData.forEach(sale => {
            currentTotalAmount += sale.total || 0;
            
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    currentTotalItems += item.quantity || 0;
                });
            }
        });
        
        // Calculer les totaux de la période précédente
        let previousTotalAmount = 0;
        let previousTotalItems = 0;
        let previousSalesCount = this.previousPeriodData.salesData.length;
        
        this.previousPeriodData.salesData.forEach(sale => {
            previousTotalAmount += sale.total || 0;
            
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    previousTotalItems += item.quantity || 0;
                });
            }
        });
        
        // Calculer les variations en pourcentage
        const totalSalesChange = previousTotalAmount === 0 ? 
            100 : ((currentTotalAmount - previousTotalAmount) / previousTotalAmount * 100);
        
        const salesCountChange = previousSalesCount === 0 ? 
            100 : ((currentSalesCount - previousSalesCount) / previousSalesCount * 100);
        
        const cigarsSoldChange = previousTotalItems === 0 ? 
            100 : ((currentTotalItems - previousTotalItems) / previousTotalItems * 100);
        
        // Mettre à jour les éléments DOM si disponibles
        if (this.totalSalesChange) {
            this.totalSalesChange.textContent = `${totalSalesChange.toFixed(2)}%`;
            this.totalSalesChange.className = totalSalesChange >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down';
            this.totalSalesChange.innerHTML = `
                <i class="fas fa-${totalSalesChange >= 0 ? 'arrow-up' : 'arrow-down'}"></i> 
                ${Math.abs(totalSalesChange).toFixed(2)}%
            `;
        }
        
        if (this.salesCountChange) {
            this.salesCountChange.textContent = `${salesCountChange.toFixed(2)}%`;
            this.salesCountChange.className = salesCountChange >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down';
            this.salesCountChange.innerHTML = `
                <i class="fas fa-${salesCountChange >= 0 ? 'arrow-up' : 'arrow-down'}"></i> 
                ${Math.abs(salesCountChange).toFixed(2)}%
            `;
        }
        
        if (this.cigarsSoldChange) {
            this.cigarsSoldChange.textContent = `${cigarsSoldChange.toFixed(2)}%`;
            this.cigarsSoldChange.className = cigarsSoldChange >= 0 ? 'stat-trend trend-up' : 'stat-trend trend-down';
            this.cigarsSoldChange.innerHTML = `
                <i class="fas fa-${cigarsSoldChange >= 0 ? 'arrow-up' : 'arrow-down'}"></i> 
                ${Math.abs(cigarsSoldChange).toFixed(2)}%
            `;
        }
    }
    
    /**
     * Applique les filtres et met à jour l'affichage
     */
    applyFilters() {
        // Filtrer les données selon les filtres actifs
        const filteredData = this.filterSalesData(this.salesData);
        
        // Mettre à jour les statistiques avec les données filtrées
        this.updateFilteredStats(filteredData);
        
        // Mettre à jour les graphiques de l'onglet actif
        this.generateTabCharts(this.activeTab);
    }
    
    /**
     * Filtre les données de vente selon les filtres actifs
     * @param {Array} salesData - Données de vente à filtrer
     * @returns {Array} - Données de vente filtrées
     */
    filterSalesData(salesData) {
        // Si aucun filtre actif, retourner toutes les données
        if (this.filters.supplier === 'all' && 
            this.filters.country === 'all' && 
            this.filters.brand === 'all') {
            return salesData;
        }
        
        // Récupérer tous les produits pour avoir les informations complètes
        return salesData.map(sale => {
            // Copier la vente pour ne pas modifier l'original
            const filteredSale = { ...sale };
            
            // Filtrer les articles selon les filtres actifs
            if (sale.items && Array.isArray(sale.items)) {
                filteredSale.items = sale.items.filter(item => {
                    // Si le produit n'a pas d'ID, le garder
                    if (!item.productId) return true;
                    
                    // Trouver le produit correspondant
                    const product = this.findProductById(item.productId);
                    if (!product) return true;
                    
                    // Filtrer par fournisseur
                    if (this.filters.supplier !== 'all' && 
                        product.supplier !== this.filters.supplier) {
                        return false;
                    }
                    
                    // Filtrer par pays
                    if (this.filters.country !== 'all' && 
                        product.country !== this.filters.country) {
                        return false;
                    }
                    
                    // Filtrer par marque
                    if (this.filters.brand !== 'all' && 
                        product.brand !== this.filters.brand) {
                        return false;
                    }
                    
                    return true;
                });
                
                // Recalculer le total de la vente
                filteredSale.total = filteredSale.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
            }
            
            return filteredSale;
        }).filter(sale => sale.items.length > 0);
    }
    
    /**
     * Trouve un produit par son ID
     * @param {number} id - ID du produit
     * @returns {Object|null} - Produit trouvé ou null
     */
    async findProductById(id) {
        try {
            return await dbManager.getProductById(id);
        } catch (error) {
            console.error(`Erreur lors de la recherche du produit ${id}:`, error);
            return null;
        }
    }
    
    /**
     * Met à jour les statistiques avec les données filtrées
     * @param {Array} filteredData - Données de vente filtrées
     */
    updateFilteredStats(filteredData) {
        // Calculer les totaux avec les données filtrées
        let totalAmount = 0;
        let totalItems = 0;
        
        filteredData.forEach(sale => {
            totalAmount += sale.total || 0;
            
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    totalItems += item.quantity || 0;
                });
            }
        });
        
        // Mettre à jour les statistiques
        this.totalSales.textContent = `${totalAmount.toFixed(2)} €`;
        this.salesCount.textContent = filteredData.length;
        this.cigarsSold.textContent = totalItems;
    }
    
    /**
     * Prépare les données pour les graphiques
     * @param {Array} salesData - Données de vente
     * @returns {Promise<Object>} - Données pour les différents graphiques
     */
    async prepareChartData(salesData) {
        // Produits les plus vendus (par quantité)
        const productsMap = new Map();
        
        // Produits les plus vendus (par montant)
        const productsRevenueMap = new Map();
        
        // Ventes par fournisseur
        const suppliersMap = new Map();
        
        // Ventes par pays
        const countriesMap = new Map();
        
        // Ventes par marque
        const brandsMap = new Map();
        
        // Ventes par gamme de prix
        const priceTiersMap = new Map([
            ['< 5€', 0],
            ['5-10€', 0],
            ['10-15€', 0],
            ['15-20€', 0],
            ['20-30€', 0],
            ['30-50€', 0],
            ['> 50€', 0]
        ]);
        
        // Récupérer tous les produits pour avoir leurs infos complètes
        const allProducts = await dbManager.getAllProducts();
        const productsById = new Map();
        
        // Créer un map d'ID de produit vers produit pour un accès plus rapide
        allProducts.forEach(product => {
            productsById.set(product.id, product);
        });
        
        // Parcourir toutes les ventes
        for (const sale of salesData) {
            if (!sale.items || !Array.isArray(sale.items)) continue;
            
            for (const item of sale.items) {
                const productKey = `${item.productBrand} ${item.productName}`;
                const quantity = item.quantity || 0;
                const subtotal = item.subtotal || 0;
                const unitPrice = item.price || 0;
                
                // Ajouter au compteur de produits par quantité
                if (productsMap.has(productKey)) {
                    productsMap.set(productKey, productsMap.get(productKey) + quantity);
                } else {
                    productsMap.set(productKey, quantity);
                }
                
                // Ajouter au compteur de produits par revenu
                if (productsRevenueMap.has(productKey)) {
                    productsRevenueMap.set(productKey, productsRevenueMap.get(productKey) + subtotal);
                } else {
                    productsRevenueMap.set(productKey, subtotal);
                }
                
                // Récupérer le produit pour avoir le fournisseur et le pays
                const product = productsById.get(item.productId);
                
                if (product) {
                    // Ajouter au compteur de fournisseurs
                    const supplier = product.supplier || 'Inconnu';
                    if (suppliersMap.has(supplier)) {
                        suppliersMap.set(supplier, {
                            amount: suppliersMap.get(supplier).amount + subtotal,
                            quantity: suppliersMap.get(supplier).quantity + quantity
                        });
                    } else {
                        suppliersMap.set(supplier, { amount: subtotal, quantity });
                    }
                    
                    // Ajouter au compteur de pays
                    const country = product.country || 'Inconnu';
                    if (countriesMap.has(country)) {
                        countriesMap.set(country, {
                            amount: countriesMap.get(country).amount + subtotal,
                            quantity: countriesMap.get(country).quantity + quantity
                        });
                    } else {
                        countriesMap.set(country, { amount: subtotal, quantity });
                    }
                    
                    // Ajouter au compteur de marques
                    const brand = product.brand || 'Inconnu';
                    if (brandsMap.has(brand)) {
                        brandsMap.set(brand, {
                            amount: brandsMap.get(brand).amount + subtotal,
                            quantity: brandsMap.get(brand).quantity + quantity
                        });
                    } else {
                        brandsMap.set(brand, { amount: subtotal, quantity });
                    }
                    
                    // Ajouter à la gamme de prix correspondante
                    let priceTier;
                    if (unitPrice < 5) priceTier = '< 5€';
                    else if (unitPrice < 10) priceTier = '5-10€';
                    else if (unitPrice < 15) priceTier = '10-15€';
                    else if (unitPrice < 20) priceTier = '15-20€';
                    else if (unitPrice < 30) priceTier = '20-30€';
                    else if (unitPrice < 50) priceTier = '30-50€';
                    else priceTier = '> 50€';
                    
                    priceTiersMap.set(priceTier, priceTiersMap.get(priceTier) + quantity);
                }
            }
        }
        
        // Convertir les maps en tableaux triés
        const topProducts = Array.from(productsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.config.topProductsLimit)
            .map(([name, quantity]) => ({ name, quantity }));
        
        const topProductsByRevenue = Array.from(productsRevenueMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.config.topProductsLimit)
            .map(([name, amount]) => ({ name, amount }));
        
        const supplierSales = Array.from(suppliersMap.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([name, data]) => ({ name, ...data }));
        
        const countrySales = Array.from(countriesMap.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([name, data]) => ({ name, ...data }));
        
        const brandSales = Array.from(brandsMap.entries())
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([name, data]) => ({ name, ...data }));
        
        const salesByPriceTier = Array.from(priceTiersMap.entries())
            .map(([name, quantity]) => ({ name, quantity }));
        
        return { 
            topProducts, 
            topProductsByRevenue, 
            supplierSales, 
            countrySales, 
            brandSales,
            salesByPriceTier
        };
    }
    
    /**
     * Prépare les données pour les graphiques de tendance
     * @returns {Promise<Object>} - Données pour les graphiques de tendance
     */
    async prepareTrendData() {
        // Si aucune vente ou pas de comparaison, sortir
        if (!this.salesData.length || !this.filters.compareWithPrevious) {
            return null;
        }
        
        // Données actuelles
        const currentData = await this.prepareChartData(this.salesData);
        
        // Données de la période précédente
        const previousData = await this.prepareChartData(this.previousPeriodData.salesData);
        
        return { currentData, previousData };
    }
    
    /**
     * Construit le contenu HTML pour l'onglet vue d'ensemble
     */
    async renderOverviewTab() {
        const container = document.getElementById('overview-stats-container');
        if (!container) return;
        
        // Préparer les données pour les graphiques
        const chartData = await this.prepareChartData(this.salesData);
        
        // Créer la structure HTML pour la vue d'ensemble
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Produits les plus vendus</h5>
                            <canvas id="topProductsOverviewChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Répartition des ventes par pays</h5>
                            <canvas id="countrySalesOverviewChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Répartition par fournisseur</h5>
                            <canvas id="supplierSalesOverviewChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Ventes par gamme de prix</h5>
                            <canvas id="salesByPriceTierChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Créer les graphiques
        this.createTopProductsChart('topProductsOverviewChart', chartData.topProducts);
        this.createCountrySalesChart('countrySalesOverviewChart', chartData.countrySales);
        this.createSupplierSalesChart('supplierSalesOverviewChart', chartData.supplierSales);
        this.createPriceTierChart('salesByPriceTierChart', chartData.salesByPriceTier);
    }
    
    /**
     * Construit le contenu HTML pour l'onglet analyse par produit
     */
    async renderProductsTab() {
        const container = document.getElementById('products-stats-container');
        if (!container) return;
        
        // Préparer les données pour les graphiques
        const chartData = await this.prepareChartData(this.salesData);
        
        // Créer la structure HTML pour l'analyse par produit
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Top produits par quantité vendue</h5>
                            <canvas id="topProductsQuantityChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Top produits par chiffre d'affaires</h5>
                            <canvas id="topProductsRevenueChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Ventes par marque</h5>
                            <canvas id="brandSalesChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Analyse détaillée des produits</h5>
                            <div id="productDetailsTable" class="table-responsive" style="max-height: ${this.config.defaultChartHeight}px; overflow-y: auto;">
                                ${this.generateProductDetailsTable(chartData)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Créer les graphiques
        this.createTopProductsChart('topProductsQuantityChart', chartData.topProducts);
        this.createTopProductsByRevenueChart('topProductsRevenueChart', chartData.topProductsByRevenue);
        this.createBrandSalesChart('brandSalesChart', chartData.brandSales);
    }
    
    /**
     * Génère un tableau HTML détaillé des produits
     * @param {Object} chartData - Données des graphiques
     * @returns {string} - HTML du tableau
     */
    generateProductDetailsTable(chartData) {
        if (!chartData || !chartData.topProductsByRevenue || chartData.topProductsByRevenue.length === 0) {
            return '<p class="text-center">Aucune donnée disponible</p>';
        }
        
        // Calculer le total des ventes
        const totalRevenue = chartData.topProductsByRevenue.reduce((sum, product) => sum + product.amount, 0);
        
        // Générer le tableau HTML
        let tableHTML = `
            <table class="table table-sm table-striped">
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>CA (€)</th>
                        <th>% du CA</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Ajouter les lignes de produits
        chartData.topProductsByRevenue.forEach(product => {
            const percentage = (product.amount / totalRevenue * 100).toFixed(2);
            
            tableHTML += `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.amount.toFixed(2)} €</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }
    
    /**
     * Construit le contenu HTML pour l'onglet analyse par fournisseur
     */
    async renderSuppliersTab() {
        const container = document.getElementById('suppliers-stats-container');
        if (!container) return;
        
        // Préparer les données pour les graphiques
        const chartData = await this.prepareChartData(this.salesData);
        
        // Créer la structure HTML pour l'analyse par fournisseur
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Répartition des ventes par fournisseur</h5>
                            <canvas id="supplierSalesDetailChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Performance des fournisseurs</h5>
                            <div id="supplierDetailsTable" class="table-responsive" style="max-height: ${this.config.defaultChartHeight}px; overflow-y: auto;">
                                ${this.generateSupplierDetailsTable(chartData)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Ventes des fournisseurs par pays d'origine</h5>
                            <canvas id="suppliersByCountryChart" height="${Math.floor(this.config.defaultChartHeight/2)}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Créer les graphiques
        this.createSupplierSalesChart('supplierSalesDetailChart', chartData.supplierSales);
        this.createSuppliersByCountryChart('suppliersByCountryChart', chartData.supplierSales, chartData.countrySales);
    }
    
    /**
     * Génère un tableau HTML détaillé des fournisseurs
     * @param {Object} chartData - Données des graphiques
     * @returns {string} - HTML du tableau
     */
    generateSupplierDetailsTable(chartData) {
        if (!chartData || !chartData.supplierSales || chartData.supplierSales.length === 0) {
            return '<p class="text-center">Aucune donnée disponible</p>';
        }
        
        // Calculer le total des ventes
        const totalAmount = chartData.supplierSales.reduce((sum, supplier) => sum + supplier.amount, 0);
        const totalQuantity = chartData.supplierSales.reduce((sum, supplier) => sum + supplier.quantity, 0);
        
        // Générer le tableau HTML
        let tableHTML = `
            <table class="table table-sm table-striped">
                <thead>
                    <tr>
                        <th>Fournisseur</th>
                        <th>CA (€)</th>
                        <th>% du CA</th>
                        <th>Quantité</th>
                        <th>% Quantité</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Ajouter les lignes de fournisseurs
        chartData.supplierSales.forEach(supplier => {
            const amountPercentage = (supplier.amount / totalAmount * 100).toFixed(2);
            const quantityPercentage = (supplier.quantity / totalQuantity * 100).toFixed(2);
            
            tableHTML += `
                <tr>
                    <td>${supplier.name}</td>
                    <td>${supplier.amount.toFixed(2)} €</td>
                    <td>${amountPercentage}%</td>
                    <td>${supplier.quantity}</td>
                    <td>${quantityPercentage}%</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }
    
    /**
     * Construit le contenu HTML pour l'onglet tendances
     */
    async renderTrendsTab() {
        const container = document.getElementById('trends-stats-container');
        if (!container) return;
        
        // Si la comparaison n'est pas activée, afficher un message
        if (!this.filters.compareWithPrevious) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    Activez l'option "Comparer avec période précédente" pour voir les tendances.
                </div>
            `;
            return;
        }
        
        // Préparer les données pour les graphiques
        const trendData = await this.prepareTrendData();
        
        if (!trendData) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-circle"></i> 
                    Données insuffisantes pour l'analyse des tendances.
                </div>
            `;
            return;
        }
        
        // Créer la structure HTML pour l'analyse des tendances
        container.innerHTML = `
            <div class="period-comparison mb-4">
                <div class="alert alert-info">
                    <strong>Comparaison:</strong> 
                    ${this.formatDateRange(this.startDate, this.endDate)} vs. 
                    ${this.formatDateRange(this.previousPeriodData.startDate, this.previousPeriodData.endDate)}
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Évolution des produits populaires</h5>
                            <canvas id="productsTrendChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Évolution des ventes par fournisseur</h5>
                            <canvas id="suppliersTrendChart" height="${this.config.defaultChartHeight}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <div class="card mb-4">
                        <div class="card-body">
                            <h5 class="card-title">Tableau comparatif des ventes</h5>
                            ${this.generateComparativeTable(trendData)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Créer les graphiques
        this.createProductsTrendChart('productsTrendChart', trendData);
        this.createSuppliersTrendChart('suppliersTrendChart', trendData);
    }
    
    /**
     * Génère un tableau HTML comparatif des ventes
     * @param {Object} trendData - Données de tendance
     * @returns {string} - HTML du tableau
     */
    generateComparativeTable(trendData) {
        if (!trendData || !trendData.currentData || !trendData.previousData) {
            return '<p class="text-center">Données insuffisantes pour la comparaison</p>';
        }
        
        // Calculer les totaux
        const currentTotal = trendData.currentData.topProductsByRevenue.reduce(
            (sum, product) => sum + product.amount, 0
        );
        
        const previousTotal = trendData.previousData.topProductsByRevenue.reduce(
            (sum, product) => sum + product.amount, 0
        );
        
        // Créer un Map pour accéder facilement aux produits par nom
        const previousProductsMap = new Map();
        trendData.previousData.topProductsByRevenue.forEach(product => {
            previousProductsMap.set(product.name, product.amount);
        });
        
        // Générer le tableau HTML
        let tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-sm">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Période actuelle (€)</th>
                            <th>Période précédente (€)</th>
                            <th>Variation (€)</th>
                            <th>Variation (%)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Ajouter les lignes de produits
        trendData.currentData.topProductsByRevenue.slice(0, 10).forEach(product => {
            const previousAmount = previousProductsMap.get(product.name) || 0;
            const variation = product.amount - previousAmount;
            const variationPercentage = previousAmount === 0 ? 
                100 : (variation / previousAmount * 100);
            
            const variationClass = variation >= 0 ? 'text-success' : 'text-danger';
            const arrowIcon = variation >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            tableHTML += `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.amount.toFixed(2)} €</td>
                    <td>${previousAmount.toFixed(2)} €</td>
                    <td class="${variationClass}">${variation.toFixed(2)} €</td>
                    <td class="${variationClass}">
                        <i class="fas ${arrowIcon}"></i> 
                        ${Math.abs(variationPercentage).toFixed(2)}%
                    </td>
                </tr>
            `;
        });
        
        // Ajouter la ligne de total
        const totalVariation = currentTotal - previousTotal;
        const totalVariationPercentage = previousTotal === 0 ? 
            100 : (totalVariation / previousTotal * 100);
        
        const totalVariationClass = totalVariation >= 0 ? 'text-success' : 'text-danger';
        const totalArrowIcon = totalVariation >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        tableHTML += `
                <tr class="fw-bold">
                    <td>TOTAL</td>
                    <td>${currentTotal.toFixed(2)} €</td>
                    <td>${previousTotal.toFixed(2)} €</td>
                    <td class="${totalVariationClass}">${totalVariation.toFixed(2)} €</td>
                    <td class="${totalVariationClass}">
                        <i class="fas ${totalArrowIcon}"></i> 
                        ${Math.abs(totalVariationPercentage).toFixed(2)}%
                    </td>
                </tr>
            </tbody>
            </table>
        </div>
        `;
        
        return tableHTML;
    }
    
    /**
     * Formate une plage de dates pour l'affichage
     * @param {Date} startDate - Date de début
     * @param {Date} endDate - Date de fin
     * @returns {string} - Plage de dates formatée
     */
    formatDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return 'Période non spécifiée';
        }
        
        const startStr = startDate.toLocaleDateString('fr-FR');
        // Soustraire un jour à la date de fin pour l'affichage
        const displayEndDate = new Date(endDate);
        displayEndDate.setDate(displayEndDate.getDate() - 1);
        const endStr = displayEndDate.toLocaleDateString('fr-FR');
        
        return `${startStr} au ${endStr}`;
    }
    
    /**
     * Crée le graphique des produits les plus vendus
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createTopProductsChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des produits les plus vendus non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucun produit vendu pour cette période');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Limiter les données aux 10 premiers produits
        const chartData = data.slice(0, 10);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => this.truncateLabel(item.name, 20)),
                datasets: [{
                    label: 'Quantité vendue',
                    data: chartData.map(item => item.quantity),
                    backgroundColor: this.colorPalettes.primary.slice(0, chartData.length),
                    borderColor: this.colorPalettes.primary.map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantité'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // Afficher le nom complet du produit
                                return data[context[0].dataIndex].name;
                            },
                            label: function(context) {
                                return `Quantité: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des produits les plus vendus par chiffre d'affaires
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createTopProductsByRevenueChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique de CA non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucun produit vendu pour cette période');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Limiter les données aux 10 premiers produits
        const chartData = data.slice(0, 10);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => this.truncateLabel(item.name, 20)),
                datasets: [{
                    label: 'Chiffre d\'affaires',
                    data: chartData.map(item => item.amount),
                    backgroundColor: this.colorPalettes.primary.slice(0, chartData.length),
                    borderColor: this.colorPalettes.primary.map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Chiffre d\'affaires (€)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // Afficher le nom complet du produit
                                return data[context[0].dataIndex].name;
                            },
                            label: function(context) {
                                return `CA: ${context.raw.toFixed(2)} €`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des ventes par fournisseur
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createSupplierSalesChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des fournisseurs non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucune donnée disponible');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Limiter les données aux 8 premiers fournisseurs et regrouper le reste
        let chartData = [...data];
        if (chartData.length > 8) {
            const topSuppliers = chartData.slice(0, 7);
            const otherSuppliers = chartData.slice(7);
            
            const otherAmount = otherSuppliers.reduce((sum, supplier) => sum + supplier.amount, 0);
            const otherQuantity = otherSuppliers.reduce((sum, supplier) => sum + supplier.quantity, 0);
            
            chartData = [...topSuppliers, { name: 'Autres', amount: otherAmount, quantity: otherQuantity }];
        }
        
        // Générer des couleurs
        const colors = this.generateColors(chartData.length);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartData.map(item => this.truncateLabel(item.name, 20)),
                datasets: [{
                    data: chartData.map(item => item.amount),
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // Afficher le nom complet du fournisseur
                                return chartData[context[0].dataIndex].name;
                            },
                            label: function(context) {
                                const value = context.raw.toFixed(2);
                                const quantity = chartData[context.dataIndex].quantity;
                                return [
                                    `CA: ${value} €`,
                                    `Quantité: ${quantity}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des ventes par pays
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createCountrySalesChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des pays non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucune donnée disponible');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Limiter les données aux 8 premiers pays et regrouper le reste
        let chartData = [...data];
        if (chartData.length > 8) {
            const topCountries = chartData.slice(0, 7);
            const otherCountries = chartData.slice(7);
            
            const otherAmount = otherCountries.reduce((sum, country) => sum + country.amount, 0);
            const otherQuantity = otherCountries.reduce((sum, country) => sum + country.quantity, 0);
            
            chartData = [...topCountries, { name: 'Autres', amount: otherAmount, quantity: otherQuantity }];
        }
        
        // Utiliser la palette de couleurs des pays
        const colors = {
            background: this.colorPalettes.countries.slice(0, chartData.length),
            border: this.colorPalettes.countries.map(color => color.replace('0.7', '1')).slice(0, chartData.length)
        };
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(item => item.name),
                datasets: [{
                    data: chartData.map(item => item.quantity),
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const quantity = context.raw;
                                const amount = chartData[context.dataIndex].amount.toFixed(2);
                                return [
                                    `Quantité: ${quantity} cigares`,
                                    `CA: ${amount} €`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des ventes par marque
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createBrandSalesChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des marques non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucune donnée disponible');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Limiter les données aux 8 premières marques et regrouper le reste
        let chartData = [...data];
        if (chartData.length > 8) {
            const topBrands = chartData.slice(0, 7);
            const otherBrands = chartData.slice(7);
            
            const otherAmount = otherBrands.reduce((sum, brand) => sum + brand.amount, 0);
            const otherQuantity = otherBrands.reduce((sum, brand) => sum + brand.quantity, 0);
            
            chartData = [...topBrands, { name: 'Autres', amount: otherAmount, quantity: otherQuantity }];
        }
        
        // Utiliser la palette de couleurs des marques
        const colors = {
            background: this.colorPalettes.brands.slice(0, chartData.length),
            border: this.colorPalettes.brands.map(color => color.replace('0.7', '1')).slice(0, chartData.length)
        };
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: chartData.map(item => item.name),
                datasets: [{
                    data: chartData.map(item => item.amount),
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const amount = context.raw.toFixed(2);
                                const quantity = chartData[context.dataIndex].quantity;
                                return [
                                    `CA: ${amount} €`,
                                    `Quantité: ${quantity} cigares`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des ventes par gamme de prix
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} data - Données pour le graphique
     */
    createPriceTierChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des gammes de prix non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!data || data.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucune donnée disponible');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Définir des couleurs par gamme de prix
        const colors = [
            'rgba(75, 192, 192, 0.6)',   // < 5€
            'rgba(54, 162, 235, 0.6)',   // 5-10€
            'rgba(153, 102, 255, 0.6)',  // 10-15€
            'rgba(255, 206, 86, 0.6)',   // 15-20€
            'rgba(255, 159, 64, 0.6)',   // 20-30€
            'rgba(255, 99, 132, 0.6)',   // 30-50€
            'rgba(201, 203, 207, 0.6)'   // > 50€
        ];
        
        // Trier les données selon l'ordre des gammes de prix
        const sortedData = data.sort((a, b) => {
            const order = [
                '< 5€', '5-10€', '10-15€', '15-20€', '20-30€', '30-50€', '> 50€'
            ];
            return order.indexOf(a.name) - order.indexOf(b.name);
        });
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(item => item.name),
                datasets: [{
                    label: 'Quantité vendue',
                    data: sortedData.map(item => item.quantity),
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantité'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Quantité: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des tendances de produits
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Object} trendData - Données de tendance
     */
    createProductsTrendChart(canvasId, trendData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des tendances de produits non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!trendData || !trendData.currentData || !trendData.previousData) {
            this.drawNoDataMessage(ctx, 'Données insuffisantes pour la comparaison');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Préparer les données pour la comparaison
        const topProducts = trendData.currentData.topProducts.slice(0, 5);
        
        // Créer un map des produits précédents pour un accès facile
        const previousProductsMap = new Map();
        trendData.previousData.topProducts.forEach(product => {
            previousProductsMap.set(product.name, product.quantity);
        });
        
        // Préparer les données pour le graphique
        const labels = topProducts.map(product => this.truncateLabel(product.name, 15));
        const currentValues = topProducts.map(product => product.quantity);
        const previousValues = topProducts.map(product => previousProductsMap.get(product.name) || 0);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Période actuelle',
                        data: currentValues,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Période précédente',
                        data: previousValues,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantité'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return topProducts[context[0].dataIndex].name;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des tendances de fournisseurs
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Object} trendData - Données de tendance
     */
    createSuppliersTrendChart(canvasId, trendData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des tendances de fournisseurs non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!trendData || !trendData.currentData || !trendData.previousData) {
            this.drawNoDataMessage(ctx, 'Données insuffisantes pour la comparaison');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Préparer les données pour la comparaison
        const topSuppliers = trendData.currentData.supplierSales.slice(0, 5);
        
        // Créer un map des fournisseurs précédents pour un accès facile
        const previousSuppliersMap = new Map();
        trendData.previousData.supplierSales.forEach(supplier => {
            previousSuppliersMap.set(supplier.name, supplier.amount);
        });
        
        // Préparer les données pour le graphique
        const labels = topSuppliers.map(supplier => this.truncateLabel(supplier.name, 15));
        const currentValues = topSuppliers.map(supplier => supplier.amount);
        const previousValues = topSuppliers.map(supplier => previousSuppliersMap.get(supplier.name) || 0);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Période actuelle',
                        data: currentValues,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Période précédente',
                        data: previousValues,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Chiffre d\'affaires (€)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return topSuppliers[context[0].dataIndex].name;
                            },
                            label: function(context) {
                                return `CA: ${context.raw.toFixed(2)} €`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des fournisseurs par pays
     * @param {string} canvasId - ID du canvas pour le graphique
     * @param {Array} supplierData - Données des fournisseurs
     * @param {Array} countryData - Données des pays
     */
    createSuppliersByCountryChart(canvasId, supplierData, countryData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} pour le graphique des fournisseurs par pays non disponible`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Contexte 2D non disponible pour le canvas');
            return;
        }
        
        // Si aucune donnée, afficher un message
        if (!supplierData || !countryData || supplierData.length === 0 || countryData.length === 0) {
            this.drawNoDataMessage(ctx, 'Aucune donnée disponible');
            return;
        }
        
        // Détruire le graphique existant s'il existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Cette fonction est plus complexe car elle nécessite de récupérer la relation entre fournisseurs et pays
        // Pour cet exemple, nous allons simuler cette relation
        
        // Simuler la relation entre fournisseurs et pays
        const relationData = [
            { supplier: 'Fournisseur 1', country: 'Cuba', amount: 1250 },
            { supplier: 'Fournisseur 1', country: 'République Dominicaine', amount: 850 },
            { supplier: 'Fournisseur 2', country: 'Nicaragua', amount: 980 },
            { supplier: 'Fournisseur 3', country: 'Cuba', amount: 750 },
        ];
        
        // Limiter les données aux 5 premiers fournisseurs
        const topSuppliers = supplierData.slice(0, 5).map(s => s.name);
        
        // Préparer les données pour le graphique
        const datasets = countryData.slice(0, 5).map((country, index) => {
            // Filtrer les données pour ce pays
            const countryValues = [];
            
            topSuppliers.forEach(supplier => {
                // Trouver la relation pour ce fournisseur et ce pays
                const relation = relationData.find(r => 
                    r.supplier === supplier && r.country === country.name
                );
                
                countryValues.push(relation ? relation.amount : 0);
            });
            
            return {
                label: country.name,
                data: countryValues,
                backgroundColor: this.colorPalettes.countries[index],
                borderColor: this.colorPalettes.countries[index].replace('0.7', '1'),
                borderWidth: 1
            };
        });
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topSuppliers,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Chiffre d\'affaires (€)'
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Dessine un message "Aucune donnée" dans un canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte du canvas
     * @param {string} message - Message à afficher
     */
    drawNoDataMessage(ctx, message) {
        // Effacer le canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Dessiner le message
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
    
    /**
     * Tronque une étiquette si elle dépasse une certaine longueur
     * @param {string} label - Étiquette à tronquer
     * @param {number} maxLength - Longueur maximale
     * @returns {string} - Étiquette tronquée
     */
    truncateLabel(label, maxLength = 20) {
        if (!label) return '';
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength) + '...';
    }
    
    /**
     * Génère des couleurs pour les graphiques
     * @param {number} count - Nombre de couleurs à générer
     * @returns {Object} - Couleurs pour l'arrière-plan et les bordures
     */
    generateColors(count) {
        const background = [];
        const border = [];
        
        // Utiliser une palette prédéfinie pour les 10 premières couleurs
        const palette = this.colorPalettes.primary;
        
        for (let i = 0; i < count; i++) {
            if (i < palette.length) {
                background.push(palette[i]);
                border.push(palette[i].replace('0.6', '1'));
            } else {
                // Générer des couleurs aléatoires pour les éléments supplémentaires
                const r = Math.floor(Math.random() * 256);
                const g = Math.floor(Math.random() * 256);
                const b = Math.floor(Math.random() * 256);
                
                background.push(`rgba(${r}, ${g}, ${b}, 0.6)`);
                border.push(`rgba(${r}, ${g}, ${b}, 1)`);
            }
        }
        
        return { background, border };
    }
    
    /**
     * Exporte les statistiques vers un fichier Excel amélioré
     */
    async exportStats() {
        try {
            if (this.salesData.length === 0) {
                alert('Aucune donnée à exporter');
                return;
            }
            
            // Récupérer les données préparées pour les graphiques
            const chartData = await this.prepareChartData(this.salesData);
            
            // Créer un classeur avec plusieurs feuilles
            const wb = XLSX.utils.book_new();
            
            // Informations sur la période
            const periodInfo = [
                ['Rapport généré le', new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR')],
                ['Période analysée', this.formatDateRange(this.startDate, this.endDate)],
                ['Filtres actifs', this.getActiveFiltersDescription()]
            ];
            
            // Feuille 1: Résumé des statistiques
            const summaryData = [
                ['Statistiques de ventes - CigarManager'],
                [''],
                ...periodInfo,
                [''],
                ['Indicateurs clés', ''],
                ['Total des ventes', parseFloat(this.totalSales.textContent) + ' €'],
                ['Nombre de ventes', parseInt(this.salesCount.textContent)],
                ['Cigares vendus', parseInt(this.cigarsSold.textContent)]
            ];
            
            // Ajouter des informations de tendance si disponibles
            if (this.filters.compareWithPrevious && this.previousPeriodData.salesData) {
                const previousPeriod = this.formatDateRange(this.previousPeriodData.startDate, this.previousPeriodData.endDate);
                
                // Calculer les variations
                const currentTotal = parseFloat(this.totalSales.textContent);
                let previousTotal = 0;
                let previousSalesCount = 0;
                let previousCigarsSold = 0;
                
                this.previousPeriodData.salesData.forEach(sale => {
                    previousTotal += sale.total || 0;
                    previousSalesCount++;
                    
                    if (sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach(item => {
                            previousCigarsSold += item.quantity || 0;
                        });
                    }
                });
                
                // Calculer les pourcentages de variation
                const totalVariation = ((currentTotal - previousTotal) / previousTotal * 100).toFixed(2);
                const salesCountVariation = ((parseInt(this.salesCount.textContent) - previousSalesCount) / previousSalesCount * 100).toFixed(2);
                const cigarsSoldVariation = ((parseInt(this.cigarsSold.textContent) - previousCigarsSold) / previousCigarsSold * 100).toFixed(2);
                
                // Ajouter les informations de comparaison
                summaryData.push(['']);
                summaryData.push(['Comparaison avec période précédente', previousPeriod]);
                summaryData.push(['Variation du CA', totalVariation + '%']);
                summaryData.push(['Variation du nombre de ventes', salesCountVariation + '%']);
                summaryData.push(['Variation des cigares vendus', cigarsSoldVariation + '%']);
            }
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');
            
            // Feuille 2: Produits les plus vendus (par quantité)
            const productsData = [
                ['Produits les plus vendus par quantité'],
                [''],
                ['Produit', 'Quantité vendue', '% du total']
            ];
            
            const totalQuantity = chartData.topProducts.reduce((sum, product) => sum + product.quantity, 0);
            
            chartData.topProducts.forEach(product => {
                const percentage = (product.quantity / totalQuantity * 100).toFixed(2);
                productsData.push([product.name, product.quantity, percentage + '%']);
            });
            
            const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
            XLSX.utils.book_append_sheet(wb, productsSheet, 'Top Produits (Quantité)');
            
            // Feuille 3: Produits les plus vendus (par revenu)
            const revenueData = [
                ['Produits les plus vendus par chiffre d\'affaires'],
                [''],
                ['Produit', 'Chiffre d\'affaires (€)', '% du CA total']
            ];
            
            const totalRevenue = chartData.topProductsByRevenue.reduce((sum, product) => sum + product.amount, 0);
            
            chartData.topProductsByRevenue.forEach(product => {
                const percentage = (product.amount / totalRevenue * 100).toFixed(2);
                revenueData.push([product.name, product.amount.toFixed(2), percentage + '%']);
            });
            
            const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
            XLSX.utils.book_append_sheet(wb, revenueSheet, 'Top Produits (CA)');
            
            // Feuille 4: Ventes par fournisseur
            const suppliersData = [
                ['Analyse des ventes par fournisseur'],
                [''],
                ['Fournisseur', 'Chiffre d\'affaires (€)', '% du CA', 'Quantité vendue', '% de la quantité']
            ];
            
            const totalSupplierRevenue = chartData.supplierSales.reduce((sum, supplier) => sum + supplier.amount, 0);
            const totalSupplierQuantity = chartData.supplierSales.reduce((sum, supplier) => sum + supplier.quantity, 0);
            
            chartData.supplierSales.forEach(supplier => {
                const revenuePercentage = (supplier.amount / totalSupplierRevenue * 100).toFixed(2);
                const quantityPercentage = (supplier.quantity / totalSupplierQuantity * 100).toFixed(2);
                
                suppliersData.push([
                    supplier.name, 
                    supplier.amount.toFixed(2), 
                    revenuePercentage + '%',
                    supplier.quantity,
                    quantityPercentage + '%'
                ]);
            });
            
            const suppliersSheet = XLSX.utils.aoa_to_sheet(suppliersData);
            XLSX.utils.book_append_sheet(wb, suppliersSheet, 'Ventes par fournisseur');
            
            // Feuille 5: Ventes par pays
            const countriesData = [
                ['Analyse des ventes par pays d\'origine'],
                [''],
                ['Pays', 'Chiffre d\'affaires (€)', '% du CA', 'Quantité vendue', '% de la quantité']
            ];
            
            const totalCountryRevenue = chartData.countrySales.reduce((sum, country) => sum + country.amount, 0);
            const totalCountryQuantity = chartData.countrySales.reduce((sum, country) => sum + country.quantity, 0);
            
            chartData.countrySales.forEach(country => {
                const revenuePercentage = (country.amount / totalCountryRevenue * 100).toFixed(2);
                const quantityPercentage = (country.quantity / totalCountryQuantity * 100).toFixed(2);
                
                countriesData.push([
                    country.name, 
                    country.amount.toFixed(2), 
                    revenuePercentage + '%',
                    country.quantity,
                    quantityPercentage + '%'
                ]);
            });
            
            const countriesSheet = XLSX.utils.aoa_to_sheet(countriesData);
            XLSX.utils.book_append_sheet(wb, countriesSheet, 'Ventes par pays');
            
            // Feuille 6: Ventes par marque
            const brandsData = [
                ['Analyse des ventes par marque'],
                [''],
                ['Marque', 'Chiffre d\'affaires (€)', '% du CA', 'Quantité vendue', '% de la quantité']
            ];
            
            const totalBrandRevenue = chartData.brandSales.reduce((sum, brand) => sum + brand.amount, 0);
            const totalBrandQuantity = chartData.brandSales.reduce((sum, brand) => sum + brand.quantity, 0);
            
            chartData.brandSales.forEach(brand => {
                const revenuePercentage = (brand.amount / totalBrandRevenue * 100).toFixed(2);
                const quantityPercentage = (brand.quantity / totalBrandQuantity * 100).toFixed(2);
                
                brandsData.push([
                    brand.name, 
                    brand.amount.toFixed(2), 
                    revenuePercentage + '%',
                    brand.quantity,
                    quantityPercentage + '%'
                ]);
            });
            
            const brandsSheet = XLSX.utils.aoa_to_sheet(brandsData);
            XLSX.utils.book_append_sheet(wb, brandsSheet, 'Ventes par marque');
            
            // Feuille 7: Ventes par gamme de prix
            const priceTiersData = [
                ['Analyse des ventes par gamme de prix'],
                [''],
                ['Gamme de prix', 'Quantité vendue', '% du total']
            ];
            
            const totalPriceTierQuantity = chartData.salesByPriceTier.reduce((sum, tier) => sum + tier.quantity, 0);
            
            // Trier les données dans l'ordre des gammes de prix
            const sortOrder = ['< 5€', '5-10€', '10-15€', '15-20€', '20-30€', '30-50€', '> 50€'];
            
            const sortedPriceTiers = chartData.salesByPriceTier.sort((a, b) => {
                return sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name);
            });
            
            sortedPriceTiers.forEach(tier => {
                const percentage = (tier.quantity / totalPriceTierQuantity * 100).toFixed(2);
                priceTiersData.push([
                    tier.name,
                    tier.quantity,
                    percentage + '%'
                ]);
            });
            
            const priceTiersSheet = XLSX.utils.aoa_to_sheet(priceTiersData);
            XLSX.utils.book_append_sheet(wb, priceTiersSheet, 'Ventes par gamme de prix');
            
            // Feuille 8: Détail des ventes
            const salesDetailData = [
                ['Détail des ventes'],
                [''],
                ['Date', 'Heure', 'Produit', 'Marque', 'Quantité', 'Prix unitaire (€)', 'Sous-total (€)']
            ];
            
            this.salesData.forEach(sale => {
                const saleDate = new Date(sale.date);
                const dateStr = saleDate.toLocaleDateString('fr-FR');
                const timeStr = saleDate.toLocaleTimeString('fr-FR');
                
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        salesDetailData.push([
                            dateStr,
                            timeStr,
                            item.productName,
                            item.productBrand,
                            item.quantity,
                            item.price.toFixed(2),
                            item.subtotal.toFixed(2)
                        ]);
                    });
                }
            });
            
            const salesDetailSheet = XLSX.utils.aoa_to_sheet(salesDetailData);
            XLSX.utils.book_append_sheet(wb, salesDetailSheet, 'Détail des ventes');
            
            // Définir des largeurs de colonnes pour toutes les feuilles
            ['Résumé', 'Top Produits (Quantité)', 'Top Produits (CA)', 'Ventes par fournisseur', 
             'Ventes par pays', 'Ventes par marque', 'Ventes par gamme de prix', 'Détail des ventes'].forEach(sheetName => {
                const sheet = wb.Sheets[sheetName];
                if (!sheet) return;
                
                sheet['!cols'] = [
                    { wch: 30 }, // Colonne A
                    { wch: 15 }, // Colonne B
                    { wch: 15 }, // Colonne C
                    { wch: 15 }, // Colonne D
                    { wch: 15 }  // Colonne E
                ];
            });
            
            // Générer le fichier Excel
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Télécharger le fichier
            const fileName = `statistiques_ventes_${this.formatDateForFilename()}.xlsx`;
            saveAs(blob, fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'exportation des statistiques:', error);
            alert('Erreur lors de l\'exportation des statistiques.');
        }
    }
    
    /**
     * Récupère une description des filtres actifs
     * @returns {string} - Description des filtres actifs
     */
    getActiveFiltersDescription() {
        const activeFilters = [];
        
        if (this.filters.supplier !== 'all') {
            activeFilters.push(`Fournisseur: ${this.filters.supplier}`);
        }
        
        if (this.filters.country !== 'all') {
            activeFilters.push(`Pays: ${this.filters.country}`);
        }
        
        if (this.filters.brand !== 'all') {
            activeFilters.push(`Marque: ${this.filters.brand}`);
        }
        
        if (this.filters.compareWithPrevious) {
            activeFilters.push('Comparaison avec période précédente: Oui');
        }
        
        return activeFilters.length > 0 ? activeFilters.join(' | ') : 'Aucun filtre actif';
    }
    
    /**
     * Formate la date pour le nom de fichier
     * @returns {string} - Date formatée
     */
    formatDateForFilename() {
        if (!this.startDate || !this.endDate) {
            return new Date().toISOString().slice(0, 10);
        }
        
        const startStr = this.startDate.toISOString().slice(0, 10);
        const endDate = new Date(this.endDate);
        endDate.setDate(endDate.getDate() - 1);
        const endStr = endDate.toISOString().slice(0, 10);
        
        return `${startStr}_a_${endStr}`;
    }
}

// Exporter le gestionnaire de statistiques amélioré
const statsManager = new StatsManager();