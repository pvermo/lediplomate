/**
 * Tableau de bord amélioré pour CigarManager
 * Ajoute une vue synthétique des KPIs et du stock
 */

class DashboardManager {
    constructor() {
        this.dashboardSection = null;
        this.charts = {};
        this.refreshInterval = null;
        
        // Configuration du tableau de bord
        this.config = {
            lowStockThreshold: 5,
            criticalStockThreshold: 2,
            dashboardRefreshInterval: 60000, // 1 minute
            topProductsLimit: 5,
            topSuppliersLimit: 5
        };
    }
    
    /**
     * Initialise le tableau de bord
     */
    async init() {
        // Créer la section du tableau de bord
        this.createDashboardSection();
        
        // Ajouter le lien dans le menu latéral
        this.addSidebarLink();
        
        // Charger les données initiales
        await this.loadDashboardData();
        
        // Configurer le rafraîchissement automatique
        this.setupAutoRefresh();
        
        console.log('Tableau de bord initialisé');
    }
    
    /**
     * Crée la section du tableau de bord dans le HTML
     */
    createDashboardSection() {
        // Vérifier si la section existe déjà
        if (document.getElementById('dashboard-section')) {
            this.dashboardSection = document.getElementById('dashboard-section');
            return;
        }
        
        // Créer la section
        this.dashboardSection = document.createElement('section');
        this.dashboardSection.id = 'dashboard-section';
        this.dashboardSection.className = 'content-section';
        
        this.dashboardSection.innerHTML = `
            <div class="section-header">
                <h3>Tableau de bord</h3>
                <div class="dashboard-actions">
                    <button id="refreshDashboardBtn" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-sync-alt"></i> Actualiser
                    </button>
                    <div class="dashboard-date text-muted small ms-3">
                        Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}
                    </div>
                </div>
            </div>
            
            <div class="dashboard-container">
                <!-- KPIs -->
                <div class="row mb-4">
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="dashboard-card">
                            <div class="dashboard-card-icon bg-primary">
                                <i class="fas fa-boxes"></i>
                            </div>
                            <div class="dashboard-card-content">
                                <h5>Stock total</h5>
                                <h2 id="dashboardTotalStock">0</h2>
                                <div class="text-muted small">produits en stock</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="dashboard-card">
                            <div class="dashboard-card-icon bg-success">
                                <i class="fas fa-euro-sign"></i>
                            </div>
                            <div class="dashboard-card-content">
                                <h5>Valeur du stock</h5>
                                <h2 id="dashboardStockValue">0 €</h2>
                                <div class="text-muted small">valeur totale</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="dashboard-card">
                            <div class="dashboard-card-icon bg-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="dashboard-card-content">
                                <h5>Stock faible</h5>
                                <h2 id="dashboardLowStock">0</h2>
                                <div class="text-muted small">produits à réapprovisionner</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="dashboard-card">
                            <div class="dashboard-card-icon bg-info">
                                <i class="fas fa-shopping-cart"></i>
                            </div>
                            <div class="dashboard-card-content">
                                <h5>Ventes du jour</h5>
                                <h2 id="dashboardDailySales">0 €</h2>
                                <div class="text-muted small" id="dashboardDailySalesCount">0 ventes</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Graphiques et tableaux -->
                <div class="row">
                    <!-- Graphique des stocks par pays -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5>Répartition du stock par pays</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="stockByCountryChart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Produits à stock faible -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5>Produits à réapprovisionner</h5>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th>Produit</th>
                                <th>Marque</th>
                                <th>Stock</th>
                                <th>Prix</th>
                                <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="lowStockTableBody">
                                <!-- Produits à stock faible seront ajoutés dynamiquement -->
                                <tr>
                                    <td colspan="5" class="text-center">Chargement...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="row">
        <!-- Top 5 des produits les plus vendus -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5>Top produits (30 derniers jours)</h5>
                </div>
                <div class="card-body">
                    <canvas id="topProductsChart" height="250"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Évolution des ventes -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5>Évolution des ventes</h5>
                </div>
                <div class="card-body">
                    <canvas id="salesEvolutionChart" height="250"></canvas>
                </div>
            </div>
        </div>
    </div>
    
    <div class="row">
        <!-- Répartition par fournisseur -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5>Répartition par fournisseur</h5>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary active" id="supplierChartStock">Stock</button>
                        <button class="btn btn-outline-primary" id="supplierChartValue">Valeur</button>
                    </div>
                </div>
                <div class="card-body">
                    <canvas id="supplierDistributionChart" height="250"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Dernières ventes -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5>Dernières ventes</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Produits</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody id="recentSalesTableBody">
                                <!-- Dernières ventes seront ajoutées dynamiquement -->
                                <tr>
                                    <td colspan="3" class="text-center">Chargement...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
        `;
        
        // Ajouter la section au contenu principal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(this.dashboardSection);
            
            // Ajouter l'événement au bouton d'actualisation
            const refreshBtn = document.getElementById('refreshDashboardBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadDashboardData());
            }
            
            // Ajouter les événements aux boutons de changement de vue pour le graphique des fournisseurs
            const supplierChartStockBtn = document.getElementById('supplierChartStock');
            const supplierChartValueBtn = document.getElementById('supplierChartValue');
            
            if (supplierChartStockBtn && supplierChartValueBtn) {
                supplierChartStockBtn.addEventListener('click', () => {
                    supplierChartStockBtn.classList.add('active');
                    supplierChartValueBtn.classList.remove('active');
                    this.updateSupplierChart('stock');
                });
                
                supplierChartValueBtn.addEventListener('click', () => {
                    supplierChartValueBtn.classList.add('active');
                    supplierChartStockBtn.classList.remove('active');
                    this.updateSupplierChart('value');
                });
            }
        }
    }
    
    /**
     * Ajoute le lien du tableau de bord dans le menu latéral
     */
    addSidebarLink() {
        const sidebarMenu = document.querySelector('.sidebar-menu');
        
        if (sidebarMenu) {
            // Vérifier si le lien existe déjà
            if (document.querySelector('[data-target="dashboard-section"]')) {
                return;
            }
            
            // Créer l'élément de menu
            const dashboardMenuItem = document.createElement('li');
            dashboardMenuItem.setAttribute('data-target', 'dashboard-section');
            dashboardMenuItem.innerHTML = '<i class="fas fa-tachometer-alt"></i> Tableau de bord';
            
            // Insérer au début du menu
            sidebarMenu.insertBefore(dashboardMenuItem, sidebarMenu.firstChild);
            
            // Ajouter l'événement de clic
            dashboardMenuItem.addEventListener('click', () => {
                // Retirer la classe active de tous les éléments du menu
                document.querySelectorAll('.sidebar-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Masquer toutes les sections
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Activer l'élément de menu et la section du tableau de bord
                dashboardMenuItem.classList.add('active');
                this.dashboardSection.classList.add('active');
                
                // Mettre à jour le titre de section
                const currentSectionTitle = document.getElementById('currentSection');
                if (currentSectionTitle) {
                    currentSectionTitle.textContent = 'Tableau de bord';
                }
                
                // Actualiser les données du tableau de bord
                this.loadDashboardData();
            });
        }
    }
    
    /**
     * Configure le rafraîchissement automatique du tableau de bord
     */
    setupAutoRefresh() {
        // Annuler l'intervalle existant si présent
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Créer un nouvel intervalle
        this.refreshInterval = setInterval(() => {
            // Ne rafraîchir que si le tableau de bord est visible
            if (this.dashboardSection.classList.contains('active')) {
                this.loadDashboardData();
                console.log('Rafraîchissement automatique du tableau de bord');
            }
        }, this.config.dashboardRefreshInterval);
    }
    
    /**
     * Charge les données pour le tableau de bord
     */
    async loadDashboardData() {
        try {
            // Afficher l'indicateur d'actualisation
            const refreshBtn = document.getElementById('refreshDashboardBtn');
            if (refreshBtn) {
                const originalHTML = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualisation...';
                refreshBtn.disabled = true;
                
                // Restaurer le bouton après un délai
                setTimeout(() => {
                    refreshBtn.innerHTML = originalHTML;
                    refreshBtn.disabled = false;
                }, 1000);
            }
            
            // Mettre à jour la date de dernière actualisation
            const dashboardDate = document.querySelector('.dashboard-date');
            if (dashboardDate) {
                dashboardDate.textContent = `Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}`;
            }
            
            // Charger les données nécessaires
            const products = await dbManager.getAllProducts();
            const sales = await this.loadRecentSales();
            
            // Mettre à jour les KPIs
            this.updateKPIs(products, sales);
            
            // Mettre à jour le tableau des produits à stock faible
            this.updateLowStockTable(products);
            
            // Mettre à jour le tableau des dernières ventes
            this.updateRecentSalesTable(sales);
            
            // Mettre à jour les graphiques
            this.updateCharts(products, sales);
            
        } catch (error) {
            console.error('Erreur lors du chargement des données du tableau de bord:', error);
            
            // Afficher une notification d'erreur si le gestionnaire de notifications est disponible
            if (window.notificationManager) {
                window.notificationManager.error('Erreur lors de l\'actualisation du tableau de bord');
            } else {
                alert('Erreur lors de l\'actualisation du tableau de bord');
            }
        }
    }
    
    /**
     * Charge les ventes récentes (30 derniers jours)
     * @returns {Promise<Array>} - Promesse contenant les ventes récentes
     */
    async loadRecentSales() {
        // Calculer la date d'il y a 30 jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Récupérer les ventes de cette période
        return await dbManager.getSalesByDateRange(thirtyDaysAgo, new Date());
    }
    
    /**
     * Met à jour les indicateurs clés de performance
     * @param {Array} products - Liste des produits
     * @param {Array} sales - Liste des ventes récentes
     */
    updateKPIs(products, sales) {
        // Calculer le stock total
        const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
        
        // Calculer la valeur du stock
        const stockValue = products.reduce((sum, product) => sum + ((product.stock || 0) * (product.price || 0)), 0);
        
        // Compter les produits à faible stock
        const lowStockCount = products.filter(product => 
            (product.stock || 0) > 0 && 
            (product.stock || 0) <= this.config.lowStockThreshold
        ).length;
        
        // Calculer les ventes du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= today;
        });
        
        const todaySalesTotal = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        
        // Mettre à jour l'affichage
        document.getElementById('dashboardTotalStock').textContent = totalStock.toLocaleString('fr-FR');
        document.getElementById('dashboardStockValue').textContent = `${stockValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        document.getElementById('dashboardLowStock').textContent = lowStockCount;
        document.getElementById('dashboardDailySales').textContent = `${todaySalesTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        document.getElementById('dashboardDailySalesCount').textContent = `${todaySales.length} vente${todaySales.length !== 1 ? 's' : ''}`;
    }
    
    /**
     * Met à jour le tableau des produits à stock faible
     * @param {Array} products - Liste des produits
     */
    updateLowStockTable(products) {
        const tableBody = document.getElementById('lowStockTableBody');
        if (!tableBody) return;
        
        // Vider le tableau
        tableBody.innerHTML = '';
        
        // Filtrer les produits à faible stock
        const lowStockProducts = products
            .filter(product => 
                (product.stock || 0) > 0 && 
                (product.stock || 0) <= this.config.lowStockThreshold
            )
            .sort((a, b) => (a.stock || 0) - (b.stock || 0));
        
        if (lowStockProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Aucun produit à réapprovisionner</td></tr>';
            return;
        }
        
        // Ajouter les produits au tableau
        lowStockProducts.forEach(product => {
            const row = document.createElement('tr');
            
            // Définir la classe selon le niveau de stock
            if ((product.stock || 0) <= this.config.criticalStockThreshold) {
                row.className = 'table-danger';
            } else {
                row.className = 'table-warning';
            }
            
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.brand}</td>
                <td class="fw-bold">${product.stock}</td>
                <td>${product.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-stock" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            // Ajouter l'événement pour modifier le stock
            row.querySelector('.edit-stock').addEventListener('click', () => {
                this.editProductStock(product);
            });
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Met à jour le tableau des ventes récentes
     * @param {Array} sales - Liste des ventes
     */
    updateRecentSalesTable(sales) {
        const tableBody = document.getElementById('recentSalesTableBody');
        if (!tableBody) return;
        
        // Vider le tableau
        tableBody.innerHTML = '';
        
        // Trier les ventes par date (plus récentes en premier)
        const recentSales = [...sales].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        ).slice(0, 10); // Limiter aux 10 plus récentes
        
        if (recentSales.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Aucune vente récente</td></tr>';
            return;
        }
        
        // Ajouter les ventes au tableau
        recentSales.forEach(sale => {
            const row = document.createElement('tr');
            
            // Formater la date
            const saleDate = new Date(sale.date);
            const dateStr = saleDate.toLocaleDateString('fr-FR');
            const timeStr = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            // Résumé des produits
            let productsStr = '';
            if (sale.items && sale.items.length > 0) {
                if (sale.items.length === 1) {
                    productsStr = `${sale.items[0].productBrand} ${sale.items[0].productName} (x${sale.items[0].quantity})`;
                } else {
                    productsStr = `${sale.items.length} produits`;
                }
            }
            
            row.innerHTML = `
                <td>${dateStr} ${timeStr}</td>
                <td>${productsStr}</td>
                <td>${sale.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            `;
            
            // Ajouter un effet pour les ventes du jour
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (saleDate >= today) {
                row.classList.add('table-success');
            }
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Met à jour les graphiques du tableau de bord
     * @param {Array} products - Liste des produits
     * @param {Array} sales - Liste des ventes
     */
    updateCharts(products, sales) {
        // Graphique de répartition du stock par pays
        this.updateStockByCountryChart(products);
        
        // Graphique des produits les plus vendus
        this.updateTopProductsChart(sales);
        
        // Graphique d'évolution des ventes
        this.updateSalesEvolutionChart(sales);
        
        // Graphique de répartition par fournisseur
        this.updateSupplierChart('stock', products);
    }
    
    /**
     * Met à jour le graphique de répartition du stock par pays
     * @param {Array} products - Liste des produits
     */
    updateStockByCountryChart(products) {
        const canvas = document.getElementById('stockByCountryChart');
        if (!canvas) return;
        
        // Regrouper les produits par pays
        const countriesData = {};
        
        products.forEach(product => {
            const country = product.country || 'Inconnu';
            const stock = product.stock || 0;
            
            if (!countriesData[country]) {
                countriesData[country] = { stock: 0, value: 0 };
            }
            
            countriesData[country].stock += stock;
            countriesData[country].value += stock * (product.price || 0);
        });
        
        // Convertir en tableaux pour le graphique
        const labels = Object.keys(countriesData).sort();
        const data = labels.map(country => countriesData[country].stock);
        
        // Détruire le graphique existant s'il existe
        if (this.charts.stockByCountry) {
            this.charts.stockByCountry.destroy();
        }
        
        // Créer le graphique
        this.charts.stockByCountry = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nombre de cigares',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(255, 99, 255, 0.7)',
                        'rgba(255, 150, 150, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)',
                        'rgb(255, 159, 64)',
                        'rgb(159, 159, 159)',
                        'rgb(83, 102, 255)',
                        'rgb(255, 99, 255)',
                        'rgb(255, 150, 150)'
                    ],
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
                            text: 'Quantité en stock'
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
                                const country = context.label;
                                const stock = context.raw;
                                const value = countriesData[country].value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                
                                return [
                                    `Stock: ${stock} cigares`,
                                    `Valeur: ${value} €`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Met à jour le graphique des produits les plus vendus
     * @param {Array} sales - Liste des ventes
     */
    updateTopProductsChart(sales) {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) return;
        
        // Compter les produits vendus
        const productsMap = new Map();
        
        sales.forEach(sale => {
            if (!sale.items || !Array.isArray(sale.items)) return;
            
            sale.items.forEach(item => {
                const productKey = `${item.productBrand} ${item.productName}`;
                const quantity = item.quantity || 0;
                
                if (productsMap.has(productKey)) {
                    productsMap.set(productKey, productsMap.get(productKey) + quantity);
                } else {
                    productsMap.set(productKey, quantity);
                }
            });
        });
        
        // Trier et limiter aux top produits
        const topProducts = Array.from(productsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.config.topProductsLimit);
        
        // Préparer les données pour le graphique
        const labels = topProducts.map(([name]) => name);
        const data = topProducts.map(([, quantity]) => quantity);
        
        // Détruire le graphique existant s'il existe
        if (this.charts.topProducts) {
            this.charts.topProducts.destroy();
        }
        
        // Créer le graphique
        this.charts.topProducts = new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const percentage = ((context.raw / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Met à jour le graphique d'évolution des ventes
     * @param {Array} sales - Liste des ventes
     */
    updateSalesEvolutionChart(sales) {
        const canvas = document.getElementById('salesEvolutionChart');
        if (!canvas) return;
        
        // Regrouper les ventes par jour
        const salesByDay = {};
        
        // Créer un objet pour les 30 derniers jours
        const dateLabels = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const dateKey = date.toISOString().split('T')[0];
            dateLabels.push(dateKey);
            salesByDay[dateKey] = 0;
        }
        
        // Remplir avec les données de ventes
        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const dateKey = saleDate.toISOString().split('T')[0];
            
            if (salesByDay[dateKey] !== undefined) {
                salesByDay[dateKey] += sale.total || 0;
            }
        });
        
        // Préparer les données pour le graphique
        const data = dateLabels.map(date => salesByDay[date]);
        
        // Formater les dates pour l'affichage (jj/mm)
        const formattedLabels = dateLabels.map(date => {
            const [year, month, day] = date.split('-');
            return `${day}/${month}`;
        });
        
        // Détruire le graphique existant s'il existe
        if (this.charts.salesEvolution) {
            this.charts.salesEvolution.destroy();
        }
        
        // Créer le graphique
        this.charts.salesEvolution = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: 'Chiffre d\'affaires (€)',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
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
                            text: 'Chiffre d\'affaires (€)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date (jj/mm)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return `CA: ${value} €`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Met à jour le graphique de répartition par fournisseur
     * @param {string} mode - Mode d'affichage ('stock' ou 'value')
     * @param {Array} products - Liste des produits (optionnel)
     */
    updateSupplierChart(mode, products = null) {
        const canvas = document.getElementById('supplierDistributionChart');
        if (!canvas) return;
        
        // Si les produits ne sont pas fournis, essayer de les charger
        if (!products) {
            dbManager.getAllProducts().then(fetchedProducts => {
                this.updateSupplierChart(mode, fetchedProducts);
            }).catch(error => {
                console.error('Erreur lors du chargement des produits:', error);
            });
            return;
        }
        
        // Regrouper les produits par fournisseur
        const suppliersData = {};
        
        products.forEach(product => {
            const supplier = product.supplier || 'Inconnu';
            const stock = product.stock || 0;
            const value = stock * (product.price || 0);
            
            if (!suppliersData[supplier]) {
                suppliersData[supplier] = { stock: 0, value: 0 };
            }
            
            suppliersData[supplier].stock += stock;
            suppliersData[supplier].value += value;
        });
        
        // Trier par stock ou valeur selon le mode
        const sortedSuppliers = Object.entries(suppliersData)
            .sort((a, b) => {
                if (mode === 'value') {
                    return b[1].value - a[1].value;
                }
                return b[1].stock - a[1].stock;
            })
            .slice(0, this.config.topSuppliersLimit);
        
        // Préparer les données pour le graphique
        const labels = sortedSuppliers.map(([name]) => name);
        const data = sortedSuppliers.map(([, data]) => mode === 'value' ? data.value : data.stock);
        
        // Détruire le graphique existant s'il existe
        if (this.charts.supplierDistribution) {
            this.charts.supplierDistribution.destroy();
        }
        
        // Créer le graphique
        this.charts.supplierDistribution = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const supplier = context.label;
                                const supplierData = suppliersData[supplier] || { stock: 0, value: 0 };
                                
                                if (mode === 'value') {
                                    const value = context.raw.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    const stock = supplierData.stock;
                                    return [
                                        `Valeur: ${value} €`,
                                        `Stock: ${stock} cigares`
                                    ];
                                } else {
                                    const stock = context.raw;
                                    const value = supplierData.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    return [
                                        `Stock: ${stock} cigares`,
                                        `Valeur: ${value} €`
                                    ];
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Ouvre une fenêtre pour modifier le stock d'un produit
     * @param {Object} product - Produit à modifier
     */
    editProductStock(product) {
        // Créer une boîte de dialogue personnalisée
        const newStock = prompt(`Modifier le stock de ${product.brand} ${product.name}`, product.stock);
        
        // Vérifier si l'utilisateur a annulé
        if (newStock === null) return;
        
        // Vérifier que la valeur est un nombre valide
        const stockValue = parseInt(newStock);
        if (isNaN(stockValue) || stockValue < 0) {
            alert('Veuillez entrer un nombre positif');
            return;
        }
        
        // Mettre à jour le stock
        productManager.updateProductStock(product.id, stockValue)
            .then(() => {
                // Actualiser les données du tableau de bord
                this.loadDashboardData();
                
                // Afficher une notification si le gestionnaire est disponible
                if (window.notificationManager) {
                    window.notificationManager.success(`Stock de ${product.brand} ${product.name} mis à jour`);
                }
            })
            .catch(error => {
                console.error('Erreur lors de la mise à jour du stock:', error);
                
                // Afficher une notification d'erreur
                if (window.notificationManager) {
                    window.notificationManager.error(`Erreur lors de la mise à jour du stock: ${error.message}`);
                } else {
                    alert(`Erreur lors de la mise à jour du stock: ${error.message}`);
                }
            });
    }
}

// CSS pour le tableau de bord
const dashboardCSS = `
/* Styles pour le tableau de bord */
.dashboard-container {
    padding: 10px 0;
}

/* Cartes d'indicateurs */
.dashboard-card {
    position: relative;
    display: flex;
    align-items: center;
    background-color: white;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    overflow: hidden;
    height: 100%;
    min-height: 120px;
    padding: 15px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dashboard-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.dashboard-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-right: 15px;
    font-size: 24px;
    color: white;
}

.dashboard-card-content {
    flex: 1;
}

.dashboard-card h5 {
    margin: 0 0 5px;
    font-size: 14px;
    font-weight: 500;
    color: #777;
}

.dashboard-card h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--dark-color);
}

/* Couleurs d'icônes */
.bg-primary {
    background-color: var(--primary-color);
}

.bg-success {
    background-color: var(--success-color);
}

.bg-warning {
    background-color: var(--warning-color);
}

.bg-info {
    background-color: var(--secondary-color);
}

/* Cartes de graphiques */
.dashboard-container .card {
    height: 100%;
    box-shadow: var(--box-shadow);
    border: none;
    border-radius: var(--border-radius);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dashboard-container .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.dashboard-container .card-header {
    background-color: white;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    padding: 15px 20px;
}

.dashboard-container .card-header h5 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

/* Tableaux du tableau de bord */
.dashboard-container .table-responsive {
    max-height: 250px;
    overflow-y: auto;
}

.dashboard-container .table {
    margin-bottom: 0;
}

.dashboard-container .table-sm td, 
.dashboard-container .table-sm th {
    padding: 0.5rem;
}

/* Boutons de type de graphique */
.dashboard-container .btn-group .btn {
    font-size: 12px;
    padding: 0.25rem 0.5rem;
}

/* Adaptations pour le mode sombre */
body.dark-mode .dashboard-card {
    background-color: var(--card-bg);
}

body.dark-mode .dashboard-card h5 {
    color: var(--text-muted);
}

body.dark-mode .dashboard-card h2 {
    color: var(--text-color);
}

body.dark-mode .dashboard-container .card-header {
    background-color: var(--card-bg);
    border-color: var(--border-color);
}

/* Animation pour les cartes qui nécessitent attention */
@keyframes pulseWarning {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
}

.dashboard-container .col-md-6:nth-child(2) .dashboard-card {
    animation: pulseWarning 2s infinite;
    animation-play-state: paused;
}

.dashboard-container .col-md-6:nth-child(2) .dashboard-card:hover {
    animation-play-state: running;
}
`;

/**
 * Initialise le tableau de bord
 */
function initDashboard() {
    // Ajouter les styles CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = dashboardCSS;
    document.head.appendChild(styleElement);
    
    // Créer l'instance du gestionnaire de tableau de bord
    window.dashboardManager = new DashboardManager();
    
    // Initialiser le tableau de bord
    window.dashboardManager.init().then(() => {
        console.log('Tableau de bord initialisé avec succès');
    }).catch(error => {
        console.error('Erreur lors de l\'initialisation du tableau de bord:', error);
    });
}

// Appeler cette fonction au chargement de l'application
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initDashboard, 1500);
});