/**
 * Système d'analyse des ratios de cigares pour CigarManager
 * Aide à optimiser le stock en fonction des tendances de vente et des caractéristiques des produits
 */

class CigarRatioAnalyzer {
    constructor() {
        this.analyzedData = null;
        
        // Configuration de l'analyse
        this.config = {
            // Seuils pour les catégories de rotation de stock
            stockRotationThresholds: {
                high: 0.7,    // Plus de 70% du stock vendu par mois = rotation élevée
                medium: 0.3,  // Entre 30% et 70% = rotation moyenne
                low: 0        // Moins de 30% = rotation faible
            },
            
            // Période d'analyse en jours
            analysisPeriod: 90,
            
            // Poids des critères pour les recommandations
            weights: {
                stockRotation: 0.5,      // Importance de la rotation du stock
                profitMargin: 0.3,       // Importance de la marge bénéficiaire
                countryPopularity: 0.1,  // Importance de la popularité du pays d'origine
                brandPopularity: 0.1     // Importance de la popularité de la marque
            },
            
            // Catégories de prix
            priceCategories: {
                economic: { min: 0, max: 8 },
                standard: { min: 8, max: 15 },
                premium: { min: 15, max: 25 },
                luxury: { min: 25, max: Number.MAX_SAFE_INTEGER }
            }
        };
    }
    
    /**
     * Analyse les données des produits et des ventes pour générer des insights
     * @param {Array} products - Liste des produits
     * @param {Array} sales - Liste des ventes
     * @returns {Object} - Résultats de l'analyse
     */
    async analyze(products = null, sales = null) {
        // Si les produits ou les ventes ne sont pas fournis, les charger depuis la base de données
        if (!products) {
            products = await dbManager.getAllProducts();
        }
        
        if (!sales) {
            // Calculer la date de début de l'analyse
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - this.config.analysisPeriod);
            
            sales = await dbManager.getSalesByDateRange(startDate, new Date());
        }
        
        // Calculer les statistiques de vente par produit
        const salesStats = this.calculateSalesStatistics(products, sales);
        
        // Analyser la rotation du stock
        const stockRotation = this.analyzeStockRotation(products, salesStats);
        
        // Analyser la popularité des pays d'origine
        const countryPopularity = this.analyzeCountryPopularity(products, salesStats);
        
        // Analyser la popularité des marques
        const brandPopularity = this.analyzeBrandPopularity(products, salesStats);
        
        // Analyser les catégories de prix
        const priceAnalysis = this.analyzePriceCategories(products, salesStats);
        
        // Générer des recommandations d'approvisionnement
        const restockRecommendations = this.generateRestockRecommendations(
            products, salesStats, stockRotation, countryPopularity, brandPopularity
        );
        
        // Stocker les résultats de l'analyse
        this.analyzedData = {
            salesStats,
            stockRotation,
            countryPopularity,
            brandPopularity,
            priceAnalysis,
            restockRecommendations,
            timestamp: new Date().toISOString(),
            period: {
                days: this.config.analysisPeriod,
                start: new Date(Date.now() - this.config.analysisPeriod * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
            }
        };
        
        return this.analyzedData;
    }
    
    /**
     * Calcule les statistiques de vente pour chaque produit
     * @param {Array} products - Liste des produits
     * @param {Array} sales - Liste des ventes
     * @returns {Object} - Statistiques de vente par produit
     */
    calculateSalesStatistics(products, sales) {
        // Créer un objet pour stocker les statistiques par ID de produit
        const stats = {};
        
        // Initialiser les statistiques pour chaque produit
        products.forEach(product => {
            stats[product.id] = {
                id: product.id,
                name: product.name,
                brand: product.brand,
                country: product.country,
                price: product.price,
                stock: product.stock,
                quantitySold: 0,
                revenue: 0,
                salesCount: 0,
                lastSold: null
            };
        });
        
        // Calculer les ventes pour chaque produit
        sales.forEach(sale => {
            if (!sale.items || !Array.isArray(sale.items)) return;
            
            const saleDate = new Date(sale.date);
            
            sale.items.forEach(item => {
                const productId = item.productId;
                if (!stats[productId]) return;
                
                stats[productId].quantitySold += item.quantity || 0;
                stats[productId].revenue += item.subtotal || 0;
                stats[productId].salesCount++;
                
                // Mettre à jour la date de dernière vente
                if (!stats[productId].lastSold || saleDate > new Date(stats[productId].lastSold)) {
                    stats[productId].lastSold = saleDate.toISOString();
                }
            });
        });
        
        // Calculer des statistiques supplémentaires
        Object.values(stats).forEach(stat => {
            // Calculer le ratio de rotation du stock
            const daysInPeriod = this.config.analysisPeriod;
            const stockWithSales = stat.stock + stat.quantitySold;
            
            // Rotation mensuelle (quantité vendue / stock total sur la période, normalisée par mois)
            stat.monthlyRotationRatio = stockWithSales === 0 ? 0 : 
                (stat.quantitySold / stockWithSales) * (30 / daysInPeriod);
            
            // Calculer le prix moyen par unité vendue
            stat.averagePrice = stat.quantitySold === 0 ? stat.price : 
                stat.revenue / stat.quantitySold;
            
            // Jours depuis la dernière vente
            stat.daysSinceLastSale = stat.lastSold ? 
                Math.floor((new Date() - new Date(stat.lastSold)) / (1000 * 60 * 60 * 24)) : 
                daysInPeriod;
        });
        
        return stats;
    }
    
    /**
     * Analyse la rotation du stock par produit
     * @param {Array} products - Liste des produits
     * @param {Object} salesStats - Statistiques de vente par produit
     * @returns {Object} - Analyse de la rotation du stock
     */
    analyzeStockRotation(products, salesStats) {
        // Catégoriser les produits par taux de rotation
        const categories = {
            high: [],
            medium: [],
            low: [],
            none: []
        };
        
        // Calculer les statistiques globales
        let totalProducts = 0;
        let totalStock = 0;
        let totalSold = 0;
        let averageRotation = 0;
        
        Object.values(salesStats).forEach(stat => {
            totalProducts++;
            totalStock += stat.stock;
            totalSold += stat.quantitySold;
            averageRotation += stat.monthlyRotationRatio;
            
            // Catégoriser le produit selon son taux de rotation
            if (stat.quantitySold === 0) {
                categories.none.push(stat);
            } else if (stat.monthlyRotationRatio >= this.config.stockRotationThresholds.high) {
                categories.high.push(stat);
            } else if (stat.monthlyRotationRatio >= this.config.stockRotationThresholds.medium) {
                categories.medium.push(stat);
            } else {
                categories.low.push(stat);
            }
        });
        
        // Calculer la rotation moyenne
        averageRotation = totalProducts > 0 ? averageRotation / totalProducts : 0;
        
        // Calculer la rotation globale du stock
        const overallRotation = totalStock + totalSold > 0 ? 
            (totalSold / (totalStock + totalSold)) * (30 / this.config.analysisPeriod) : 0;
        
        return {
            categories,
            stats: {
                totalProducts,
                totalStock,
                totalSold,
                averageRotation,
                overallRotation
            }
        };
    }
    
    /**
     * Analyse la popularité des pays d'origine
     * @param {Array} products - Liste des produits
     * @param {Object} salesStats - Statistiques de vente par produit
     * @returns {Object} - Analyse de la popularité des pays
     */
    analyzeCountryPopularity(products, salesStats) {
        // Créer un objet pour stocker les statistiques par pays
        const countries = {};
        
        // Regrouper les ventes par pays
        Object.values(salesStats).forEach(stat => {
            const country = stat.country || 'Inconnu';
            
            if (!countries[country]) {
                countries[country] = {
                    name: country,
                    quantitySold: 0,
                    revenue: 0,
                    productCount: 0,
                    averagePrice: 0,
                    inStockCount: 0,
                    stockValue: 0
                };
            }
            
            countries[country].quantitySold += stat.quantitySold;
            countries[country].revenue += stat.revenue;
            countries[country].productCount++;
            
            if (stat.stock > 0) {
                countries[country].inStockCount++;
                countries[country].stockValue += stat.stock * stat.price;
            }
        });
        
        // Calculer des statistiques supplémentaires
        Object.values(countries).forEach(country => {
            country.averagePrice = country.quantitySold > 0 ? 
                country.revenue / country.quantitySold : 0;
            
            // Normaliser les données pour la période d'analyse
            country.monthlySales = country.quantitySold * (30 / this.config.analysisPeriod);
            country.monthlyRevenue = country.revenue * (30 / this.config.analysisPeriod);
        });
        
        // Trier les pays par quantité vendue
        const sortedCountries = Object.values(countries).sort((a, b) => 
            b.quantitySold - a.quantitySold
        );
        
        return {
            byName: countries,
            sorted: sortedCountries
        };
    }
    
    /**
     * Analyse la popularité des marques
     * @param {Array} products - Liste des produits
     * @param {Object} salesStats - Statistiques de vente par produit
     * @returns {Object} - Analyse de la popularité des marques
     */
    analyzeBrandPopularity(products, salesStats) {
        // Créer un objet pour stocker les statistiques par marque
        const brands = {};
        
        // Regrouper les ventes par marque
        Object.values(salesStats).forEach(stat => {
            const brand = stat.brand || 'Inconnu';
            
            if (!brands[brand]) {
                brands[brand] = {
                    name: brand,
                    quantitySold: 0,
                    revenue: 0,
                    productCount: 0,
                    averagePrice: 0,
                    inStockCount: 0,
                    stockValue: 0
                };
            }
            
            brands[brand].quantitySold += stat.quantitySold;
            brands[brand].revenue += stat.revenue;
            brands[brand].productCount++;
            
            if (stat.stock > 0) {
                brands[brand].inStockCount++;
                brands[brand].stockValue += stat.stock * stat.price;
            }
        });
        
        // Calculer des statistiques supplémentaires
        Object.values(brands).forEach(brand => {
            brand.averagePrice = brand.quantitySold > 0 ? 
                brand.revenue / brand.quantitySold : 0;
            
            // Normaliser les données pour la période d'analyse
            brand.monthlySales = brand.quantitySold * (30 / this.config.analysisPeriod);
            brand.monthlyRevenue = brand.revenue * (30 / this.config.analysisPeriod);
        });
        
        // Trier les marques par quantité vendue
        const sortedBrands = Object.values(brands).sort((a, b) => 
            b.quantitySold - a.quantitySold
        );
        
        return {
            byName: brands,
            sorted: sortedBrands
        };
    }
    
    /**
     * Analyse les catégories de prix
     * @param {Array} products - Liste des produits
     * @param {Object} salesStats - Statistiques de vente par produit
     * @returns {Object} - Analyse des catégories de prix
     */
    analyzePriceCategories(products, salesStats) {
        // Créer un objet pour stocker les statistiques par catégorie de prix
        const categories = {
            economic: { name: 'Économique', min: this.config.priceCategories.economic.min, max: this.config.priceCategories.economic.max },
            standard: { name: 'Standard', min: this.config.priceCategories.standard.min, max: this.config.priceCategories.standard.max },
            premium: { name: 'Premium', min: this.config.priceCategories.premium.min, max: this.config.priceCategories.premium.max },
            luxury: { name: 'Luxe', min: this.config.priceCategories.luxury.min, max: this.config.priceCategories.luxury.max }
        };
        
        // Initialiser les compteurs
        Object.values(categories).forEach(category => {
            category.quantitySold = 0;
            category.revenue = 0;
            category.productCount = 0;
            category.inStockCount = 0;
            category.stockValue = 0;
            category.products = [];
        });
        
        // Regrouper les produits par catégorie de prix
        Object.values(salesStats).forEach(stat => {
            let categoryKey = '';
            
            // Déterminer la catégorie de prix
            if (stat.price <= this.config.priceCategories.economic.max) {
                categoryKey = 'economic';
            } else if (stat.price <= this.config.priceCategories.standard.max) {
                categoryKey = 'standard';
            } else if (stat.price <= this.config.priceCategories.premium.max) {
                categoryKey = 'premium';
            } else {
                categoryKey = 'luxury';
            }
            
            // Ajouter le produit à la catégorie
            categories[categoryKey].products.push(stat);
            categories[categoryKey].productCount++;
            
            // Mettre à jour les statistiques de la catégorie
            categories[categoryKey].quantitySold += stat.quantitySold;
            categories[categoryKey].revenue += stat.revenue;
            
            if (stat.stock > 0) {
                categories[categoryKey].inStockCount++;
                categories[categoryKey].stockValue += stat.stock * stat.price;
            }
        });
        
        // Calculer des statistiques supplémentaires
        Object.values(categories).forEach(category => {
            category.averagePrice = category.quantitySold > 0 ? 
                category.revenue / category.quantitySold : 0;
            
            // Normaliser les données pour la période d'analyse
            category.monthlySales = category.quantitySold * (30 / this.config.analysisPeriod);
            category.monthlyRevenue = category.revenue * (30 / this.config.analysisPeriod);
            
            // Calculer la part des ventes
            const totalSold = Object.values(categories).reduce((sum, cat) => sum + cat.quantitySold, 0);
            category.salesPercentage = totalSold > 0 ? (category.quantitySold / totalSold) * 100 : 0;
            
            // Calculer la part du stock
            const totalStockValue = Object.values(categories).reduce((sum, cat) => sum + cat.stockValue, 0);
            category.stockPercentage = totalStockValue > 0 ? (category.stockValue / totalStockValue) * 100 : 0;
        });
        
        return categories;
    }
    
    /**
     * Génère des recommandations d'approvisionnement
     * @param {Array} products - Liste des produits
     * @param {Object} salesStats - Statistiques de vente par produit
     * @param {Object} stockRotation - Analyse de la rotation du stock
     * @param {Object} countryPopularity - Analyse de la popularité des pays
     * @param {Object} brandPopularity - Analyse de la popularité des marques
     * @returns {Object} - Recommandations d'approvisionnement
     */
    generateRestockRecommendations(products, salesStats, stockRotation, countryPopularity, brandPopularity) {
        // Créer des objets pour stocker les recommandations
        const recommendations = {
            highPriority: [],
            mediumPriority: [],
            lowPriority: [],
            noRestock: []
        };
        
        // Calculer les scores de priorité pour chaque produit
        const productsWithScores = [];
        
        Object.values(salesStats).forEach(stat => {
            // Ne pas inclure les produits sans stock qui n'ont jamais été vendus
            if (stat.stock === 0 && stat.quantitySold === 0) {
                return;
            }
            
            // Calculer le score de rotation du stock (0-1)
            const rotationScore = Math.min(1, stat.monthlyRotationRatio * 2);
            
            // Calculer le score de marge bénéficiaire (0-1)
            // Nous utilisons ici le prix comme approximation de la marge
            const priceRange = this.config.priceCategories.luxury.min - this.config.priceCategories.economic.min;
            const marginScore = Math.min(1, (stat.price - this.config.priceCategories.economic.min) / priceRange);
            
            // Calculer le score de popularité du pays d'origine (0-1)
            const countryData = countryPopularity.byName[stat.country] || { quantitySold: 0 };
            const maxCountrySales = countryPopularity.sorted.length > 0 ? 
                countryPopularity.sorted[0].quantitySold : 1;
            const countryScore = maxCountrySales > 0 ? 
                Math.min(1, countryData.quantitySold / maxCountrySales) : 0;
            
            // Calculer le score de popularité de la marque (0-1)
            const brandData = brandPopularity.byName[stat.brand] || { quantitySold: 0 };
            const maxBrandSales = brandPopularity.sorted.length > 0 ? 
                brandPopularity.sorted[0].quantitySold : 1;
            const brandScore = maxBrandSales > 0 ? 
                Math.min(1, brandData.quantitySold / maxBrandSales) : 0;
            
            // Calculer le score pondéré
            const weightedScore = 
                (rotationScore * this.config.weights.stockRotation) +
                (marginScore * this.config.weights.profitMargin) +
                (countryScore * this.config.weights.countryPopularity) +
                (brandScore * this.config.weights.brandPopularity);
            
            // Calculer le délai de réapprovisionnement recommandé
            const restockDays = this.calculateRestockDays(stat, weightedScore);
            
            // Recommandation de quantité basée sur la rotation et le stock actuel
            const recommendedQuantity = this.calculateRecommendedQuantity(stat);
            
            // Stocker les scores avec le produit
            productsWithScores.push({
                ...stat,
                scores: {
                    rotation: rotationScore,
                    margin: marginScore,
                    country: countryScore,
                    brand: brandScore,
                    weighted: weightedScore
                },
                recommendation: {
                    restockDays: restockDays,
                    quantity: recommendedQuantity
                }
            });
        });
        
        // Trier les produits par score pondéré
        productsWithScores.sort((a, b) => b.scores.weighted - a.scores.weighted);
        
        // Catégoriser les produits par priorité
        productsWithScores.forEach(product => {
            const score = product.scores.weighted;
            
            // Pas de réapprovisionnement recommandé pour les produits avec stock suffisant
            if (product.stock > product.recommendation.quantity) {
                recommendations.noRestock.push(product);
            }
            // Priorité haute (score > 0.7)
            else if (score >= 0.7) {
                recommendations.highPriority.push(product);
            }
            // Priorité moyenne (score > 0.4)
            else if (score >= 0.4) {
                recommendations.mediumPriority.push(product);
            }
            // Priorité basse
            else {
                recommendations.lowPriority.push(product);
            }
        });
        
        return {
            priorities: recommendations,
            products: productsWithScores
        };
    }
    
    /**
     * Calcule le nombre de jours recommandé avant réapprovisionnement
     * @param {Object} stat - Statistiques du produit
     * @param {number} score - Score pondéré du produit
     * @returns {number} - Nombre de jours recommandé
     */
    calculateRestockDays(stat, score) {
        // Plus le score est élevé, plus la priorité est forte (moins de jours d'attente)
        const baseRecommendation = 30; // 30 jours par défaut
        
        // Si le produit a une forte rotation, recommander un réapprovisionnement plus rapide
        if (stat.monthlyRotationRatio > this.config.stockRotationThresholds.high) {
            // Calculer le nombre de jours avant épuisement du stock
            const daysBeforeStockout = stat.stock / (stat.quantitySold / this.config.analysisPeriod);
            
            // Si le stock est faible, recommander un réapprovisionnement immédiat
            if (daysBeforeStockout < 15) {
                return 0; // Réapprovisionner immédiatement
            }
            
            return Math.min(daysBeforeStockout - 15, baseRecommendation * (1 - score));
        }
        
        // Pour les produits avec rotation moyenne à faible
        return baseRecommendation * (1 - score * 0.7);
    }
    
    /**
     * Calcule la quantité recommandée pour le réapprovisionnement
     * @param {Object} stat - Statistiques du produit
     * @returns {number} - Quantité recommandée
     */
    calculateRecommendedQuantity(stat) {
        // Calculer la quantité vendue par mois
        const monthlySales = stat.quantitySold * (30 / this.config.analysisPeriod);
        
        // Calculer la couverture de stock recommandée (en mois)
        let stockCoverage = 2; // 2 mois par défaut
        
        // Ajuster la couverture selon la rotation
        if (stat.monthlyRotationRatio >= this.config.stockRotationThresholds.high) {
            stockCoverage = 3; // 3 mois pour les produits à forte rotation
        } else if (stat.monthlyRotationRatio <= this.config.stockRotationThresholds.medium) {
            stockCoverage = 1.5; // 1.5 mois pour les produits à faible rotation
        }
        
        // Calculer la quantité recommandée
        const recommendedQuantity = Math.ceil(monthlySales * stockCoverage);
        
        // Si le produit n'a pas de ventes, recommander un stock minimal
        return recommendedQuantity > 0 ? recommendedQuantity : 5;
    }
    
    /**
     * Génère un rapport d'analyse au format HTML
     * @returns {string} - Rapport HTML
     */
    generateReport() {
        if (!this.analyzedData) {
            return '<div class="alert alert-warning">Aucune analyse disponible. Veuillez d\'abord exécuter l\'analyse.</div>';
        }
        
        // Formater les dates
        const startDate = new Date(this.analyzedData.period.start).toLocaleDateString('fr-FR');
        const endDate = new Date(this.analyzedData.period.end).toLocaleDateString('fr-FR');
        
        let html = `
            <div class="ratio-analysis-report">
                <div class="report-header">
                    <h3>Rapport d'analyse des ratios de cigares</h3>
                    <p class="text-muted">Période: ${startDate} à ${endDate} (${this.analyzedData.period.days} jours)</p>
                </div>
                
                <div class="report-section">
                    <h4>Résumé de l'analyse</h4>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">Rotation du stock</h5>
                                    <p>Rotation mensuelle moyenne: <strong>${(this.analyzedData.stockRotation.stats.averageRotation * 100).toFixed(2)}%</strong></p>
                                    <p>Rotation globale: <strong>${(this.analyzedData.stockRotation.stats.overallRotation * 100).toFixed(2)}%</strong></p>
                                    <ul>
                                        <li>Produits à forte rotation: <strong>${this.analyzedData.stockRotation.categories.high.length}</strong></li>
                                        <li>Produits à rotation moyenne: <strong>${this.analyzedData.stockRotation.categories.medium.length}</strong></li>
                                        <li>Produits à faible rotation: <strong>${this.analyzedData.stockRotation.categories.low.length}</strong></li>
                                        <li>Produits sans vente: <strong>${this.analyzedData.stockRotation.categories.none.length}</strong></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">Tendances de vente</h5>
                                    <p>Pays le plus populaire: <strong>${this.analyzedData.countryPopularity.sorted.length > 0 ? this.analyzedData.countryPopularity.sorted[0].name : 'N/A'}</strong></p>
                                    <p>Marque la plus populaire: <strong>${this.analyzedData.brandPopularity.sorted.length > 0 ? this.analyzedData.brandPopularity.sorted[0].name : 'N/A'}</strong></p>
                                    <p>Catégorie de prix la plus vendue: <strong>${this.findMostPopularPriceCategory()}</strong></p>
                                    <p>Total des ventes: <strong>${this.analyzedData.stockRotation.stats.totalSold} cigares</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h4>Recommandations d'approvisionnement</h4>
                    ${this.generateRestockRecommendationsHTML()}
                </div>
                
                <div class="report-section">
                    <h4>Analyse détaillée par catégorie</h4>
                    <ul class="nav nav-tabs" id="ratioAnalysisTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="countries-tab" data-bs-toggle="tab" data-bs-target="#countries" type="button" role="tab">Pays d'origine</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="brands-tab" data-bs-toggle="tab" data-bs-target="#brands" type="button" role="tab">Marques</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="price-categories-tab" data-bs-toggle="tab" data-bs-target="#price-categories" type="button" role="tab">Catégories de prix</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="top-products-tab" data-bs-toggle="tab" data-bs-target="#top-products" type="button" role="tab">Top produits</button>
                        </li>
                    </ul>
                    <div class="tab-content" id="ratioAnalysisTabsContent">
                        <div class="tab-pane fade show active" id="countries" role="tabpanel">
                            ${this.generateCountriesAnalysisHTML()}
                        </div>
                        <div class="tab-pane fade" id="brands" role="tabpanel">
                            ${this.generateBrandsAnalysisHTML()}
                        </div>
                        <div class="tab-pane fade" id="price-categories" role="tabpanel">
                            ${this.generatePriceCategoriesAnalysisHTML()}
                        </div>
                        <div class="tab-pane fade" id="top-products" role="tabpanel">
                            ${this.generateTopProductsAnalysisHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Trouve la catégorie de prix la plus populaire
     * @returns {string} - Nom de la catégorie
     */
    findMostPopularPriceCategory() {
        const categories = this.analyzedData.priceAnalysis;
        let maxSales = -1;
        let popular = 'N/A';
        
        Object.entries(categories).forEach(([key, category]) => {
            if (category.quantitySold > maxSales) {
                maxSales = category.quantitySold;
                popular = category.name;
            }
        });
        
        return popular;
    }
    
    /**
     * Génère le HTML pour les recommandations d'approvisionnement
     * @returns {string} - HTML des recommandations
     */
    generateRestockRecommendationsHTML() {
        const recommendations = this.analyzedData.restockRecommendations.priorities;
        
        let html = `
            <div class="accordion" id="restockAccordion">
                <!-- Priorité élevée -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="highPriorityHeading">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#highPriorityCollapse" aria-expanded="true" aria-controls="highPriorityCollapse">
                            <span class="badge bg-danger me-2">${recommendations.highPriority.length}</span> Priorité élevée
                        </button>
                    </h2>
                    <div id="highPriorityCollapse" class="accordion-collapse collapse show" aria-labelledby="highPriorityHeading">
                        <div class="accordion-body p-0">
                            ${this.generateRecommendationTableHTML(recommendations.highPriority)}
                        </div>
                    </div>
                </div>
                
                <!-- Priorité moyenne -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="mediumPriorityHeading">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mediumPriorityCollapse" aria-expanded="false" aria-controls="mediumPriorityCollapse">
                            <span class="badge bg-warning me-2">${recommendations.mediumPriority.length}</span> Priorité moyenne
                        </button>
                    </h2>
                    <div id="mediumPriorityCollapse" class="accordion-collapse collapse" aria-labelledby="mediumPriorityHeading">
                        <div class="accordion-body p-0">
                            ${this.generateRecommendationTableHTML(recommendations.mediumPriority)}
                        </div>
                    </div>
                </div>
                
                <!-- Priorité basse -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="lowPriorityHeading">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#lowPriorityCollapse" aria-expanded="false" aria-controls="lowPriorityCollapse">
                            <span class="badge bg-info me-2">${recommendations.lowPriority.length}</span> Priorité basse
                        </button>
                    </h2>
                    <div id="lowPriorityCollapse" class="accordion-collapse collapse" aria-labelledby="lowPriorityHeading">
                        <div class="accordion-body p-0">
                            ${this.generateRecommendationTableHTML(recommendations.lowPriority)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Génère le HTML pour un tableau de recommandations
     * @param {Array} products - Liste des produits
     * @returns {string} - HTML du tableau
     */
    generateRecommendationTableHTML(products) {
        if (products.length === 0) {
            return '<div class="p-3 text-center">Aucun produit dans cette catégorie</div>';
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-striped table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Marque</th>
                            <th>Stock actuel</th>
                            <th>Qté. vendue</th>
                            <th>Rotation</th>
                            <th>Qté. recommandée</th>
                            <th>Délai</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        products.forEach(product => {
            // Déterminer la classe de la ligne selon le niveau de stock
            let rowClass = '';
            if (product.stock === 0) {
                rowClass = 'table-danger';
            } else if (product.stock < product.recommendation.quantity / 3) {
                rowClass = 'table-warning';
            }
            
            // Formater le délai de réapprovisionnement
            let delayText = '';
            if (product.recommendation.restockDays <= 0) {
                delayText = '<span class="text-danger fw-bold">Immédiat</span>';
            } else if (product.recommendation.restockDays <= 7) {
                delayText = `<span class="text-warning">${Math.ceil(product.recommendation.restockDays)} jours</span>`;
            } else {
                delayText = `${Math.ceil(product.recommendation.restockDays)} jours`;
            }
            
            html += `
                <tr class="${rowClass}">
                    <td>${product.name}</td>
                    <td>${product.brand}</td>
                    <td class="text-center">${product.stock}</td>
                    <td class="text-center">${product.quantitySold}</td>
                    <td class="text-center">${(product.monthlyRotationRatio * 100).toFixed(1)}%</td>
                    <td class="text-center">${product.recommendation.quantity}</td>
                    <td class="text-center">${delayText}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Génère le HTML pour l'analyse des pays d'origine
     * @returns {string} - HTML de l'analyse
     */
    generateCountriesAnalysisHTML() {
        const countries = this.analyzedData.countryPopularity.sorted;
        
        if (countries.length === 0) {
            return '<div class="p-3 text-center">Aucune donnée disponible</div>';
        }
        
        let html = `
            <div class="table-responsive mt-3">
                <table class="table table-sm table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Pays</th>
                            <th>Qté. vendue</th>
                            <th>CA mensuel</th>
                            <th>Prix moyen</th>
                            <th>Produits en stock</th>
                            <th>Valeur du stock</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        countries.forEach(country => {
            html += `
                <tr>
                    <td>${country.name}</td>
                    <td class="text-center">${country.quantitySold}</td>
                    <td class="text-end">${country.monthlyRevenue.toFixed(2)} €</td>
                    <td class="text-end">${country.averagePrice.toFixed(2)} €</td>
                    <td class="text-center">${country.inStockCount}</td>
                    <td class="text-end">${country.stockValue.toFixed(2)} €</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Génère le HTML pour l'analyse des marques
     * @returns {string} - HTML de l'analyse
     */
    generateBrandsAnalysisHTML() {
        const brands = this.analyzedData.brandPopularity.sorted;
        
        if (brands.length === 0) {
            return '<div class="p-3 text-center">Aucune donnée disponible</div>';
        }
        
        let html = `
            <div class="table-responsive mt-3">
                <table class="table table-sm table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Marque</th>
                            <th>Qté. vendue</th>
                            <th>CA mensuel</th>
                            <th>Prix moyen</th>
                            <th>Produits en stock</th>
                            <th>Valeur du stock</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        brands.forEach(brand => {
            html += `
                <tr>
                    <td>${brand.name}</td>
                    <td class="text-center">${brand.quantitySold}</td>
                    <td class="text-end">${brand.monthlyRevenue.toFixed(2)} €</td>
                    <td class="text-end">${brand.averagePrice.toFixed(2)} €</td>
                    <td class="text-center">${brand.inStockCount}</td>
                    <td class="text-end">${brand.stockValue.toFixed(2)} €</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Génère le HTML pour l'analyse des catégories de prix
     * @returns {string} - HTML de l'analyse
     */
    generatePriceCategoriesAnalysisHTML() {
        const categories = this.analyzedData.priceAnalysis;
        
        let html = `
            <div class="table-responsive mt-3">
                <table class="table table-sm table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Catégorie</th>
                            <th>Gamme de prix</th>
                            <th>Qté. vendue</th>
                            <th>CA mensuel</th>
                            <th>Part des ventes</th>
                            <th>Produits en stock</th>
                            <th>Part du stock</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        Object.entries(categories).forEach(([key, category]) => {
            html += `
                <tr>
                    <td>${category.name}</td>
                    <td>${category.min} - ${category.max === Number.MAX_SAFE_INTEGER ? '+' : category.max} €</td>
                    <td class="text-center">${category.quantitySold}</td>
                    <td class="text-end">${category.monthlyRevenue.toFixed(2)} €</td>
                    <td class="text-center">${category.salesPercentage.toFixed(1)}%</td>
                    <td class="text-center">${category.inStockCount}</td>
                    <td class="text-center">${category.stockPercentage.toFixed(1)}%</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="alert alert-info mt-3">
                <i class="fas fa-info-circle"></i> 
                La répartition idéale du stock devrait correspondre approximativement à la part des ventes de chaque catégorie.
            </div>
        `;
        
        return html;
    }
    
    /**
     * Génère le HTML pour l'analyse des produits les plus vendus
     * @returns {string} - HTML de l'analyse
     */
    generateTopProductsAnalysisHTML() {
        // Récupérer tous les produits avec ventes
        const productsWithSales = this.analyzedData.restockRecommendations.products
            .filter(product => product.quantitySold > 0)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 15); // Limiter aux 15 premiers
        
        if (productsWithSales.length === 0) {
            return '<div class="p-3 text-center">Aucune donnée disponible</div>';
        }
        
        let html = `
            <div class="table-responsive mt-3">
                <table class="table table-sm table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Marque</th>
                            <th>Pays</th>
                            <th>Qté. vendue</th>
                            <th>Rotation</th>
                            <th>Prix</th>
                            <th>CA généré</th>
                            <th>Stock actuel</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        productsWithSales.forEach(product => {
            // Déterminer la classe de la ligne selon le niveau de stock
            let stockClass = '';
            if (product.stock === 0) {
                stockClass = 'text-danger fw-bold';
            } else if (product.stock < product.recommendation.quantity / 2) {
                stockClass = 'text-warning fw-bold';
            }
            
            html += `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.brand}</td>
                    <td>${product.country}</td>
                    <td class="text-center">${product.quantitySold}</td>
                    <td class="text-center">${(product.monthlyRotationRatio * 100).toFixed(1)}%</td>
                    <td class="text-end">${product.price.toFixed(2)} €</td>
                    <td class="text-end">${product.revenue.toFixed(2)} €</td>
                    <td class="text-center ${stockClass}">${product.stock}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    }
}

// CSS pour le rapport d'analyse
const ratioAnalysisCSS = `
/* Styles pour le rapport d'analyse des ratios de cigares */
.ratio-analysis-report {
    font-size: 0.9rem;
}

.report-header {
    margin-bottom: 20px;
}

.report-section {
    margin-bottom: 30px;
}

.report-section h4 {
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
}

/* Tableau responsive avec colonnes fixes */
.table-responsive {
    overflow-x: auto;
}

/* Accordéon de recommandations */
.ratio-analysis-report .accordion-button {
    padding: 0.75rem 1rem;
}

.ratio-analysis-report .accordion-body {
    padding: 0;
}

/* Adaption au mode sombre */
body.dark-mode .report-section h4 {
    border-color: var(--border-color);
}

body.dark-mode .ratio-analysis-report .accordion-item {
    background-color: var(--card-bg);
    border-color: var(--border-color);
}

body.dark-mode .ratio-analysis-report .accordion-button {
    background-color: var(--dark-color);
    color: var(--text-color);
}

body.dark-mode .ratio-analysis-report .accordion-button:not(.collapsed) {
    background-color: var(--primary-color);
}
`;

/**
 * Classe pour créer une interface utilisateur et afficher les résultats d'analyse
 */
class CigarRatioUI {
    constructor() {
        this.analyzer = new CigarRatioAnalyzer();
        this.section = null;
    }
    
    /**
     * Initialise l'interface utilisateur
     */
    async init() {
        // Ajouter les styles CSS
        this.addStyles();
        
        // Créer la section d'analyse des ratios
        this.createRatioSection();
        
        // Ajouter le lien dans le menu latéral
        this.addSidebarLink();
    }
    
    /**
     * Ajoute les styles CSS pour l'interface
     */
    addStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = ratioAnalysisCSS;
        document.head.appendChild(styleElement);
    }
    
    /**
     * Crée la section d'analyse des ratios dans le HTML
     */
    createRatioSection() {
        // Vérifier si la section existe déjà
        if (document.getElementById('ratio-analysis-section')) {
            this.section = document.getElementById('ratio-analysis-section');
            return;
        }
        
        // Créer la section
        this.section = document.createElement('section');
        this.section.id = 'ratio-analysis-section';
        this.section.className = 'content-section';
        
        this.section.innerHTML = `
            <div class="section-header">
                <h3>Analyse des ratios de cigares</h3>
                <div class="ratio-actions">
                    <button id="runAnalysisBtn" class="btn btn-primary">
                        <i class="fas fa-chart-line"></i> Lancer l'analyse
                    </button>
                </div>
            </div>
            
            <div class="ratio-container">
                <div class="ratio-options mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Options d'analyse</h5>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="analysisPeriod" class="form-label">Période d'analyse (jours)</label>
                                        <input type="number" class="form-control" id="analysisPeriod" min="7" max="365" value="90">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="stockRotationHigh" class="form-label">Seuil de rotation élevée (%)</label>
                                        <input type="number" class="form-control" id="stockRotationHigh" min="1" max="100" value="70">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="stockRotationMedium" class="form-label">Seuil de rotation moyenne (%)</label>
                                        <input type="number" class="form-control" id="stockRotationMedium" min="1" max="100" value="30">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Poids des critères</label>
                                        <div class="input-group mb-2">
                                            <span class="input-group-text">Rotation du stock</span>
                                            <input type="number" class="form-control" id="weightRotation" min="0" max="1" step="0.1" value="0.5">
                                        </div>
                                        <div class="input-group mb-2">
                                            <span class="input-group-text">Marge bénéficiaire</span>
                                            <input type="number" class="form-control" id="weightMargin" min="0" max="1" step="0.1" value="0.3">
                                        </div>
<div class="input-group mb-2">
                                            <span class="input-group-text">Popularité du pays</span>
                                            <input type="number" class="form-control" id="weightCountry" min="0" max="1" step="0.1" value="0.1">
                                        </div>
                                        <div class="input-group mb-2">
                                            <span class="input-group-text">Popularité de la marque</span>
                                            <input type="number" class="form-control" id="weightBrand" min="0" max="1" step="0.1" value="0.1">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="analysisResults" class="ratio-results">
                    <!-- Les résultats de l'analyse seront affichés ici -->
                    <div class="text-center p-5">
                        <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                        <p>Cliquez sur "Lancer l'analyse" pour générer un rapport d'analyse des ratios de stock et des recommandations d'approvisionnement.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter la section au contenu principal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(this.section);
            
            // Ajouter l'événement au bouton d'analyse
            const runAnalysisBtn = document.getElementById('runAnalysisBtn');
            if (runAnalysisBtn) {
                runAnalysisBtn.addEventListener('click', () => this.runAnalysis());
            }
        }
    }
    
    /**
     * Ajoute le lien d'analyse des ratios dans le menu latéral
     */
    addSidebarLink() {
        const sidebarMenu = document.querySelector('.sidebar-menu');
        
        if (sidebarMenu) {
            // Vérifier si le lien existe déjà
            if (document.querySelector('[data-target="ratio-analysis-section"]')) {
                return;
            }
            
            // Créer l'élément de menu
            const ratioMenuItem = document.createElement('li');
            ratioMenuItem.setAttribute('data-target', 'ratio-analysis-section');
            ratioMenuItem.innerHTML = '<i class="fas fa-balance-scale"></i> Analyse des ratios';
            
            // Insérer après "Statistiques"
            const statsMenuItem = document.querySelector('[data-target="stats-section"]');
            if (statsMenuItem && statsMenuItem.nextSibling) {
                sidebarMenu.insertBefore(ratioMenuItem, statsMenuItem.nextSibling);
            } else {
                sidebarMenu.appendChild(ratioMenuItem);
            }
            
            // Ajouter l'événement de clic
            ratioMenuItem.addEventListener('click', () => {
                // Retirer la classe active de tous les éléments du menu
                document.querySelectorAll('.sidebar-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Masquer toutes les sections
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Activer l'élément de menu et la section d'analyse des ratios
                ratioMenuItem.classList.add('active');
                this.section.classList.add('active');
                
                // Mettre à jour le titre de section
                const currentSectionTitle = document.getElementById('currentSection');
                if (currentSectionTitle) {
                    currentSectionTitle.textContent = 'Analyse des ratios';
                }
            });
        }
    }
    
    /**
     * Lance l'analyse des ratios
     */
    async runAnalysis() {
        try {
            // Afficher un indicateur de chargement
            const resultsContainer = document.getElementById('analysisResults');
            resultsContainer.innerHTML = `
                <div class="text-center p-5">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <p>Analyse en cours...</p>
                </div>
            `;
            
            // Récupérer les paramètres d'analyse
            const config = this.getAnalysisConfig();
            
            // Mettre à jour la configuration de l'analyseur
            this.updateAnalyzerConfig(config);
            
            // Effectuer l'analyse
            await this.analyzer.analyze();
            
            // Générer le rapport HTML
            const reportHTML = this.analyzer.generateReport();
            
            // Afficher les résultats
            resultsContainer.innerHTML = reportHTML;
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds') && document.getElementById('enableSounds').checked) {
                this.playSound('success');
            }
            
            // Afficher une notification si le gestionnaire est disponible
            if (window.notificationManager) {
                window.notificationManager.success('Analyse des ratios terminée avec succès');
            }
        } catch (error) {
            console.error('Erreur lors de l\'analyse des ratios:', error);
            
            // Afficher un message d'erreur
            const resultsContainer = document.getElementById('analysisResults');
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> 
                    Erreur lors de l'analyse: ${error.message}
                </div>
            `;
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds') && document.getElementById('enableSounds').checked) {
                this.playSound('error');
            }
            
            // Afficher une notification si le gestionnaire est disponible
            if (window.notificationManager) {
                window.notificationManager.error(`Erreur lors de l'analyse: ${error.message}`);
            }
        }
    }
    
    /**
     * Récupère les paramètres d'analyse depuis les champs du formulaire
     * @returns {Object} - Configuration d'analyse
     */
    getAnalysisConfig() {
        return {
            analysisPeriod: parseInt(document.getElementById('analysisPeriod').value) || 90,
            stockRotationThresholds: {
                high: parseFloat(document.getElementById('stockRotationHigh').value) / 100 || 0.7,
                medium: parseFloat(document.getElementById('stockRotationMedium').value) / 100 || 0.3,
                low: 0
            },
            weights: {
                stockRotation: parseFloat(document.getElementById('weightRotation').value) || 0.5,
                profitMargin: parseFloat(document.getElementById('weightMargin').value) || 0.3,
                countryPopularity: parseFloat(document.getElementById('weightCountry').value) || 0.1,
                brandPopularity: parseFloat(document.getElementById('weightBrand').value) || 0.1
            }
        };
    }
    
    /**
     * Met à jour la configuration de l'analyseur de ratios
     * @param {Object} config - Nouvelle configuration
     */
    updateAnalyzerConfig(config) {
        this.analyzer.config.analysisPeriod = config.analysisPeriod;
        this.analyzer.config.stockRotationThresholds = config.stockRotationThresholds;
        this.analyzer.config.weights = config.weights;
    }
    
    /**
     * Joue un son selon le type d'action
     * @param {string} type - Type de son (success, error)
     */
    playSound(type) {
        let sound;
        
        switch (type) {
            case 'success':
                sound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADaQCFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYXx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fH///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAVAAAAAAAAAA2na+xQxTwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');
                break;
            case 'error':
                sound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADaQCurq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq7v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAAA2mM5XVWTwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQRAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                break;
        }
        
        if (sound) {
            sound.play().catch(e => console.error('Erreur audio:', e));
        }
    }
}

/**
 * Initialise l'analyse des ratios de cigares
 */
function initCigarRatioAnalysis() {
    const ratioUI = new CigarRatioUI();
    ratioUI.init().then(() => {
        console.log('Analyse des ratios de cigares initialisée');
    }).catch(error => {
        console.error('Erreur lors de l\'initialisation de l\'analyse des ratios:', error);
    });
}

// Appeler cette fonction au chargement de l'application
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initCigarRatioAnalysis, 2000);
});