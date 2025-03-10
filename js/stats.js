/**
 * Gestion des statistiques pour l'application CigarManager
 * Affiche les graphiques et statistiques de vente
 */

class StatsManager {
    constructor() {
        // Éléments DOM
        this.statsPeriod = document.getElementById('statsPeriod');
        this.customDateRange = document.getElementById('customDateRange');
        this.statsStartDate = document.getElementById('statsStartDate');
        this.statsEndDate = document.getElementById('statsEndDate');
        this.totalSales = document.getElementById('totalSales');
        this.salesCount = document.getElementById('salesCount');
        this.cigarsSold = document.getElementById('cigarsSold');
        this.exportStatsBtn = document.getElementById('exportStatsBtn');
        
        // Charts
        this.topProductsChart = null;
        this.supplierSalesChart = null;
        this.countrySalesChart = null;
        
        // État
        this.salesData = [];
        this.startDate = null;
        this.endDate = null;
        
        // Initialiser les événements
        this.initEventListeners();
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
    }
    
    /**
     * Charge les statistiques selon la période sélectionnée
     */
    async loadStats() {
        try {
            // Déterminer les dates de début et fin
            this.calculateDateRange();
            
            // Charger les ventes pour la période
            this.salesData = await this.getSalesForPeriod();
            
            // Calculer et afficher les statistiques
            this.calculateAndDisplayStats();
            
            // Générer les graphiques
            this.generateCharts();
            
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            alert('Erreur lors du chargement des statistiques.');
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
     * Récupère les ventes pour la période spécifiée
     * @returns {Promise<Array>} - Promesse contenant les ventes de la période
     */
    async getSalesForPeriod() {
        if (!this.startDate || !this.endDate) {
            return [];
        }
        
        return await dbManager.getSalesByDateRange(this.startDate, this.endDate);
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
     * Génère les graphiques de statistiques
     */
    generateCharts() {
        // Détruire les graphiques existants pour éviter les superpositions
        if (this.topProductsChart) {
            this.topProductsChart.destroy();
        }
        
        if (this.supplierSalesChart) {
            this.supplierSalesChart.destroy();
        }
        
        if (this.countrySalesChart) {
            this.countrySalesChart.destroy();
        }
        
        // Générer les données pour les graphiques
        const { topProducts, supplierSales, countrySales } = this.prepareChartData();
        
        // Créer les graphiques
        this.createTopProductsChart(topProducts);
        this.createSupplierSalesChart(supplierSales);
        this.createCountrySalesChart(countrySales);
    }
    
    /**
     * Prépare les données pour les graphiques
     * @returns {Object} - Données pour les différents graphiques
     */
    prepareChartData() {
        // Produits les plus vendus
        const productsMap = new Map();
        
        // Ventes par fournisseur
        const suppliersMap = new Map();
        
        // Ventes par pays
        const countriesMap = new Map();
        
        // Parcourir toutes les ventes
        this.salesData.forEach(sale => {
            if (!sale.items || !Array.isArray(sale.items)) return;
            
            sale.items.forEach(async item => {
                const productKey = `${item.productBrand} ${item.productName}`;
                const quantity = item.quantity || 0;
                const subtotal = item.subtotal || 0;
                
                // Ajouter au compteur de produits
                if (productsMap.has(productKey)) {
                    productsMap.set(productKey, productsMap.get(productKey) + quantity);
                } else {
                    productsMap.set(productKey, quantity);
                }
                
                // Récupérer le produit pour avoir le fournisseur et le pays
                const product = await productManager.getProductById(item.productId);
                
                if (product) {
                    // Ajouter au compteur de fournisseurs
                    const supplier = product.supplier || 'Inconnu';
                    if (suppliersMap.has(supplier)) {
                        suppliersMap.set(supplier, suppliersMap.get(supplier) + subtotal);
                    } else {
                        suppliersMap.set(supplier, subtotal);
                    }
                    
                    // Ajouter au compteur de pays
                    const country = product.country || 'Inconnu';
                    if (countriesMap.has(country)) {
                        countriesMap.set(country, countriesMap.get(country) + quantity);
                    } else {
                        countriesMap.set(country, quantity);
                    }
                }
            });
        });
        
        // Convertir les maps en tableaux triés
        const topProducts = Array.from(productsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, quantity]) => ({ name, quantity }));
        
        const supplierSales = Array.from(suppliersMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({ name, amount }));
        
        const countrySales = Array.from(countriesMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, quantity]) => ({ name, quantity }));
        
        return { topProducts, supplierSales, countrySales };
    }
    
    /**
     * Crée le graphique des produits les plus vendus
     * @param {Array} data - Données pour le graphique
     */
    createTopProductsChart(data) {
        const ctx = document.getElementById('topProductsChart').getContext('2d');
        
        this.topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    label: 'Quantité vendue',
                    data: data.map(item => item.quantity),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
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
     * Crée le graphique des ventes par fournisseur
     * @param {Array} data - Données pour le graphique
     */
    createSupplierSalesChart(data) {
        const ctx = document.getElementById('supplierSalesChart').getContext('2d');
        
        // Générer des couleurs
        const colors = this.generateColors(data.length);
        
        this.supplierSalesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.amount),
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
                                const value = context.raw.toFixed(2);
                                return `${context.label}: ${value} €`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Crée le graphique des ventes par pays
     * @param {Array} data - Données pour le graphique
     */
    createCountrySalesChart(data) {
        const ctx = document.getElementById('countrySalesChart').getContext('2d');
        
        // Générer des couleurs
        const colors = this.generateColors(data.length);
        
        this.countrySalesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.quantity),
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
                                return `${context.label}: ${context.raw} cigares`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Génère des couleurs aléatoires pour les graphiques
     * @param {number} count - Nombre de couleurs à générer
     * @returns {Object} - Couleurs pour l'arrière-plan et les bordures
     */
    generateColors(count) {
        const background = [];
        const border = [];
        
        // Utiliser une palette prédéfinie pour les 10 premières couleurs
        const palette = [
            'rgba(54, 162, 235, 0.6)', // Bleu
            'rgba(255, 99, 132, 0.6)',  // Rouge
            'rgba(255, 206, 86, 0.6)',  // Jaune
            'rgba(75, 192, 192, 0.6)',  // Vert turquoise
            'rgba(153, 102, 255, 0.6)', // Violet
            'rgba(255, 159, 64, 0.6)',  // Orange
            'rgba(199, 199, 199, 0.6)', // Gris
            'rgba(83, 102, 255, 0.6)',  // Bleu indigo
            'rgba(255, 99, 255, 0.6)',  // Rose
            'rgba(99, 255, 132, 0.6)'   // Vert clair
        ];
        
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
     * Exporte les statistiques vers un fichier Excel
     */
    async exportStats() {
        try {
            if (this.salesData.length === 0) {
                alert('Aucune donnée à exporter');
                return;
            }
            
            // Récupérer les données préparées pour les graphiques
            const { topProducts, supplierSales, countrySales } = this.prepareChartData();
            
            // Créer un classeur avec plusieurs feuilles
            const wb = XLSX.utils.book_new();
            
            // Feuille 1: Résumé des statistiques
            const summaryData = [
                ['Période', this.formatPeriodLabel()],
                ['Total des ventes', parseFloat(this.totalSales.textContent)],
                ['Nombre de ventes', parseInt(this.salesCount.textContent)],
                ['Cigares vendus', parseInt(this.cigarsSold.textContent)]
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');
            
            // Feuille 2: Produits les plus vendus
            const productsData = [['Produit', 'Quantité vendue']];
            topProducts.forEach(product => {
                productsData.push([product.name, product.quantity]);
            });
            
            const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
            XLSX.utils.book_append_sheet(wb, productsSheet, 'Produits populaires');
            
            // Feuille 3: Ventes par fournisseur
            const suppliersData = [['Fournisseur', 'Montant des ventes (€)']];
            supplierSales.forEach(supplier => {
                suppliersData.push([supplier.name, supplier.amount]);
            });
            
            const suppliersSheet = XLSX.utils.aoa_to_sheet(suppliersData);
            XLSX.utils.book_append_sheet(wb, suppliersSheet, 'Ventes par fournisseur');
            
            // Feuille 4: Ventes par pays
            const countriesData = [['Pays', 'Quantité vendue']];
            countrySales.forEach(country => {
                countriesData.push([country.name, country.quantity]);
            });
            
            const countriesSheet = XLSX.utils.aoa_to_sheet(countriesData);
            XLSX.utils.book_append_sheet(wb, countriesSheet, 'Ventes par pays');
            
            // Feuille 5: Détail des ventes
            const salesData = [['Date', 'Produit', 'Quantité', 'Prix unitaire (€)', 'Sous-total (€)']];
            this.salesData.forEach(sale => {
                const date = new Date(sale.date);
                const dateStr = `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}`;
                
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        salesData.push([
                            dateStr,
                            `${item.productBrand} ${item.productName}`,
                            item.quantity,
                            item.price,
                            item.subtotal
                        ]);
                    });
                }
            });
            
            const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
            XLSX.utils.book_append_sheet(wb, salesSheet, 'Détail des ventes');
            
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
     * Formate l'étiquette de la période pour l'affichage
     * @returns {string} - Étiquette de la période
     */
    formatPeriodLabel() {
        if (!this.startDate || !this.endDate) {
            return 'Période non spécifiée';
        }
        
        const startStr = this.startDate.toLocaleDateString('fr-FR');
        // Soustraire un jour à la date de fin pour l'affichage
        const displayEndDate = new Date(this.endDate);
        displayEndDate.setDate(displayEndDate.getDate() - 1);
        const endStr = displayEndDate.toLocaleDateString('fr-FR');
        
        return `${startStr} au ${endStr}`;
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

// Exporter le gestionnaire de statistiques
const statsManager = new StatsManager();