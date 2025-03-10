/**
 * Gestion de l'historique des ventes pour l'application CigarManager
 * Affiche, filtre et permet la manipulation des ventes passées
 */

class HistoryManager {
    constructor() {
        // Éléments DOM
        this.historyTableBody = document.getElementById('historyTableBody');
        this.historyPeriod = document.getElementById('historyPeriod');
        this.cancelLastSaleBtn = document.getElementById('cancelLastSaleBtn');
        this.deleteAllHistoryBtn = document.getElementById('deleteAllHistoryBtn');
        
        // Modal de détails de vente
        this.saleDetailDate = document.getElementById('saleDetailDate');
        this.saleDetailTotal = document.getElementById('saleDetailTotal');
        this.saleDetailItems = document.getElementById('saleDetailItems');
        this.returnToStockBtn = document.getElementById('returnToStockBtn');
        this.deleteSaleBtn = document.getElementById('deleteSaleBtn');
        this.saleDetailsModal = new bootstrap.Modal(document.getElementById('saleDetailsModal'));
        
        // État
        this.sales = [];
        this.currentSaleId = null;
        
        // Initialiser les événements
        this.initEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        // Filtre de période
        this.historyPeriod.addEventListener('change', () => this.loadSales());
        
        // Boutons d'action
        this.cancelLastSaleBtn.addEventListener('click', () => this.confirmCancelLastSale());
        this.deleteAllHistoryBtn.addEventListener('click', () => this.confirmDeleteAllHistory());
        
        // Actions sur la vente sélectionnée
        this.returnToStockBtn.addEventListener('click', () => this.returnSaleToStock());
        this.deleteSaleBtn.addEventListener('click', () => this.deleteSale());
    }
    
    /**
     * Charge les ventes selon la période sélectionnée
     */
    async loadSales() {
        try {
            let startDate, endDate;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // Déterminer la période de filtrage
            switch (this.historyPeriod.value) {
                case 'day':
                    startDate = today;
                    endDate = new Date(today);
                    endDate.setDate(endDate.getDate() + 1);
                    break;
                    
                case 'week':
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - startDate.getDay());
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 7);
                    break;
                    
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endDate.setDate(endDate.getDate() + 1);
                    break;
                    
                case 'all':
                default:
                    // Charger toutes les ventes
                    this.sales = await dbManager.getAllSales();
                    this.renderSalesTable();
                    return;
            }
            
            // Charger les ventes de la période
            this.sales = await dbManager.getSalesByDateRange(startDate, endDate);
            this.renderSalesTable();
            
        } catch (error) {
            console.error('Erreur lors du chargement des ventes:', error);
            alert('Erreur lors du chargement des ventes.');
        }
    }
    
    /**
     * Affiche le tableau des ventes
     */
    renderSalesTable() {
        // Vider le tableau
        this.historyTableBody.innerHTML = '';
        
        if (this.sales.length === 0) {
            this.historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Aucune vente pour cette période</td></tr>';
            return;
        }
        
        // Trier les ventes par date (plus récentes en premier)
        this.sales.sort((a, b) => b.timestamp - a.timestamp);
        
        // Afficher chaque vente
        this.sales.forEach(sale => {
            const date = new Date(sale.date);
            const row = document.createElement('tr');
            
            // Formater la date et l'heure
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
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
                <td>${dateStr}</td>
                <td>${timeStr}</td>
                <td>${productsStr}</td>
                <td>${sale.total.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-sale" data-id="${sale.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            // Ajouter l'écouteur d'événement pour la vue détaillée
            row.querySelector('.view-sale').addEventListener('click', () => this.showSaleDetails(sale.id));
            
            this.historyTableBody.appendChild(row);
        });
    }
    
    /**
     * Affiche les détails d'une vente
     * @param {number} id - ID de la vente
     */
    async showSaleDetails(id) {
        try {
            const sale = await dbManager.getSaleById(id);
            
            if (!sale) {
                alert('Vente non trouvée');
                return;
            }
            
            this.currentSaleId = id;
            
            // Formater la date
            const date = new Date(sale.date);
            this.saleDetailDate.textContent = `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}`;
            
            // Afficher le total
            this.saleDetailTotal.textContent = `${sale.total.toFixed(2)} €`;
            
            // Vider la liste des articles
            this.saleDetailItems.innerHTML = '';
            
            // Afficher chaque article
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(item => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${item.productBrand} ${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)} €</td>
                        <td>${item.subtotal.toFixed(2)} €</td>
                    `;
                    
                    this.saleDetailItems.appendChild(row);
                });
            } else {
                this.saleDetailItems.innerHTML = '<tr><td colspan="4" class="text-center">Aucun article</td></tr>';
            }
            
            // Afficher le modal
            this.saleDetailsModal.show();
            
        } catch (error) {
            console.error('Erreur lors du chargement des détails de la vente:', error);
            alert('Erreur lors du chargement des détails de la vente.');
        }
    }
    
    /**
     * Supprime la vente actuellement visualisée
     */
    async deleteSale() {
        if (!this.currentSaleId) return;
        
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente?')) {
            return;
        }
        
        try {
            await dbManager.deleteSale(this.currentSaleId);
            
            // Fermer le modal et recharger les ventes
            this.saleDetailsModal.hide();
            await this.loadSales();
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('delete');
            }
            
        } catch (error) {
            console.error('Erreur lors de la suppression de la vente:', error);
            alert('Erreur lors de la suppression de la vente.');
        }
    }
    
    /**
     * Remet en stock les produits de la vente actuellement visualisée
     */
    async returnSaleToStock() {
        if (!this.currentSaleId) return;
        
        if (!confirm('Êtes-vous sûr de vouloir remettre ces produits en stock?')) {
            return;
        }
        
        try {
            const sale = await dbManager.getSaleById(this.currentSaleId);
            
            if (!sale || !sale.items || sale.items.length === 0) {
                alert('Pas d\'articles à remettre en stock');
                return;
            }
            
            // Remettre chaque article en stock
            for (const item of sale.items) {
                const product = await productManager.getProductById(item.productId);
                
                if (product) {
                    const newStock = product.stock + item.quantity;
                    await productManager.updateProductStock(item.productId, newStock);
                }
            }
            
            // Supprimer la vente
            await dbManager.deleteSale(this.currentSaleId);
            
            // Fermer le modal et recharger les ventes
            this.saleDetailsModal.hide();
            await this.loadSales();
            
            // Recharger les produits pour mettre à jour l'affichage du stock
            await productManager.loadProducts();
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('success');
            }
            
        } catch (error) {
            console.error('Erreur lors de la remise en stock:', error);
            alert('Erreur lors de la remise en stock.');
        }
    }
    
    /**
     * Demande confirmation avant d'annuler la dernière vente
     */
    async confirmCancelLastSale() {
        try {
            const lastSale = await dbManager.getLastSale();
            
            if (!lastSale) {
                alert('Aucune vente à annuler');
                return;
            }
            
            if (confirm('Êtes-vous sûr de vouloir annuler la dernière vente et remettre les produits en stock?')) {
                await this.cancelLastSale();
            }
            
        } catch (error) {
            console.error('Erreur lors de la récupération de la dernière vente:', error);
            alert('Erreur lors de la récupération de la dernière vente.');
        }
    }
    
    /**
     * Annule la dernière vente et remet les produits en stock
     */
    async cancelLastSale() {
        try {
            const lastSale = await dbManager.getLastSale();
            
            if (!lastSale) {
                return;
            }
            
            // Remettre chaque article en stock
            for (const item of lastSale.items) {
                const product = await productManager.getProductById(item.productId);
                
                if (product) {
                    const newStock = product.stock + item.quantity;
                    await productManager.updateProductStock(item.productId, newStock);
                }
            }
            
            // Supprimer la vente
            await dbManager.deleteSale(lastSale.id);
            
            // Recharger les ventes
            await this.loadSales();
            
            // Recharger les produits pour mettre à jour l'affichage du stock
            await productManager.loadProducts();
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('success');
            }
            
            alert('Dernière vente annulée avec succès');
            
        } catch (error) {
            console.error('Erreur lors de l\'annulation de la dernière vente:', error);
            alert('Erreur lors de l\'annulation de la dernière vente.');
        }
    }
    
    /**
     * Demande confirmation avant de supprimer tout l'historique
     */
    confirmDeleteAllHistory() {
        if (confirm('Êtes-vous sûr de vouloir supprimer TOUT l\'historique des ventes? Cette action est irréversible.')) {
            if (confirm('ATTENTION: Toutes les ventes seront définitivement supprimées. Confirmer?')) {
                this.deleteAllHistory();
            }
        }
    }
    
    /**
     * Supprime tout l'historique des ventes
     */
    async deleteAllHistory() {
        try {
            await dbManager.deleteAllSales();
            await this.loadSales();
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('delete');
            }
            
            alert('Historique des ventes supprimé avec succès');
            
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'historique:', error);
            alert('Erreur lors de la suppression de l\'historique.');
        }
    }
    
    /**
     * Joue un son selon le type d'action
     * @param {string} type - Type de son (success, error, delete)
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
            case 'delete':
                sound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADaQCZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZn19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAWXAAAAAAAAA2mZ33ACTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');
                break;
        }
        
        if (sound) {
            sound.play().catch(e => console.error('Erreur audio:', e));
        }
    }
}

// Exporter le gestionnaire d'historique
const historyManager = new HistoryManager();