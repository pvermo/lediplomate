/**
 * Gestion des produits (cigares) pour l'application CigarManager
 * Gère l'affichage, l'ajout, la modification et la suppression des produits
 */

class ProductManager {
    constructor() {
        // Éléments DOM
        this.productsTableBody = document.getElementById('productsTableBody');
        this.productSortBy = document.getElementById('productSortBy');
        this.productsSearch = document.getElementById('productsSearch');
        this.importProductsBtn = document.getElementById('importProductsBtn');
        this.exportProductsBtn = document.getElementById('exportProductsBtn');
        this.addProductBtn = document.getElementById('addProductBtn');
        this.resetStockBtn = document.getElementById('resetStockBtn');
        this.deleteAllProductsBtn = document.getElementById('deleteAllProductsBtn');
        this.supplierFilter = document.getElementById('supplierFilter');
        this.brandFilter = document.getElementById('brandFilter');
        this.countryFilter = document.getElementById('countryFilter');
        this.stockValueTotal = document.getElementById('stockValueTotal');
        this.stockItemsTotal = document.getElementById('stockItemsTotal');
        this.stockSummaryTable = document.getElementById('stockSummaryTable');
        
        // Éléments du modal
        this.productForm = document.getElementById('productForm');
        this.productModalTitle = document.getElementById('productModalTitle');
        this.saveProductBtn = document.getElementById('saveProductBtn');
        this.productModal = new bootstrap.Modal(document.getElementById('productModal'));
        
        // État
        this.products = [];
        this.suppliers = new Set();
        this.brands = new Set();
        this.countries = new Set();
        this.currentEditingId = null;
        this.activeFilters = {
            supplier: 'all',
            brand: 'all',
            country: 'all'
        };
        
        // Initialiser les événements
        this.initEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        // Tri et recherche
        this.productSortBy.addEventListener('change', () => this.renderProductsTable());
        this.productsSearch.addEventListener('input', () => this.renderProductsTable());
        
        // Filtres
        this.supplierFilter.addEventListener('change', () => {
            this.activeFilters.supplier = this.supplierFilter.value;
            this.renderProductsTable();
        });
        
        this.brandFilter.addEventListener('change', () => {
            this.activeFilters.brand = this.brandFilter.value;
            this.renderProductsTable();
        });
        
        this.countryFilter.addEventListener('change', () => {
            this.activeFilters.country = this.countryFilter.value;
            this.renderProductsTable();
        });
        
        // Boutons d'action
        this.importProductsBtn.addEventListener('click', () => this.showImportModal());
        this.exportProductsBtn.addEventListener('click', () => this.exportProductsToExcel());
        this.addProductBtn.addEventListener('click', () => this.showAddProductModal());
        this.resetStockBtn.addEventListener('click', () => this.confirmResetStock());
        this.deleteAllProductsBtn.addEventListener('click', () => this.confirmDeleteAllProducts());
        
        // Sauvegarde du produit
        this.saveProductBtn.addEventListener('click', () => this.saveProduct());
        
        // Import Excel
        document.getElementById('excelFileInput').addEventListener('change', (e) => this.handleExcelFileSelection(e));
        document.getElementById('confirmImportBtn').addEventListener('click', () => this.importExcelData());
    }
    
    /**
     * Charge tous les produits et initialise l'affichage
     */
    async loadProducts() {
        try {
            this.products = await dbManager.getAllProducts();
            
            // Extraire les fournisseurs, marques et pays uniques
            this.suppliers = new Set();
            this.brands = new Set();
            this.countries = new Set();
            
            this.products.forEach(product => {
                if (product.supplier) this.suppliers.add(product.supplier);
                if (product.brand) this.brands.add(product.brand);
                if (product.country) this.countries.add(product.country);
            });
            
            // Mettre à jour les filtres dropdown
            this.updateFilterDropdowns();
            
            // Calculer et afficher les totaux
            this.calculateStockTotals();
            
            // Générer le tableau récapitulatif par fournisseur
            this.generateSupplierSummary();
            
            // Rendre le tableau de produits
            this.renderProductsTable();
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            alert('Erreur lors du chargement des produits.');
        }
    }
    
    /**
     * Met à jour les listes déroulantes de filtres
     */
    updateFilterDropdowns() {
        // Vider les filtres
        this.supplierFilter.innerHTML = '<option value="all">Tous les fournisseurs</option>';
        this.brandFilter.innerHTML = '<option value="all">Toutes les marques</option>';
        this.countryFilter.innerHTML = '<option value="all">Tous les pays</option>';
        
        // Ajouter les options pour les fournisseurs
        [...this.suppliers].sort().forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            this.supplierFilter.appendChild(option);
        });
        
        // Ajouter les options pour les marques
        [...this.brands].sort().forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            this.brandFilter.appendChild(option);
        });
        
        // Ajouter les options pour les pays
        [...this.countries].sort().forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            this.countryFilter.appendChild(option);
        });
    }
    
    /**
     * Calcule les totaux du stock
     */
    calculateStockTotals() {
        let totalItems = 0;
        let totalValue = 0;
        
        this.products.forEach(product => {
            totalItems += product.stock;
            totalValue += product.stock * product.price;
        });
        
        this.stockItemsTotal.textContent = totalItems;
        this.stockValueTotal.textContent = totalValue.toFixed(2) + ' €';
    }
    
    /**
     * Génère le tableau récapitulatif par fournisseur
     */
    generateSupplierSummary() {
        // Vider le tableau
        this.stockSummaryTable.innerHTML = '';
        
        // Créer un objet pour stocker les données par fournisseur
        const supplierData = {};
        
        // Calculer les totaux par fournisseur
        this.products.forEach(product => {
            const supplier = product.supplier || 'Non spécifié';
            
            if (!supplierData[supplier]) {
                supplierData[supplier] = {
                    items: 0,
                    value: 0,
                    products: 0
                };
            }
            
            supplierData[supplier].items += product.stock;
            supplierData[supplier].value += product.stock * product.price;
            supplierData[supplier].products += 1;
        });
        
        // Convertir en tableau et trier par valeur de stock
        const suppliersArray = Object.entries(supplierData)
            .map(([name, data]) => ({
                name,
                ...data
            }))
            .sort((a, b) => b.value - a.value);
        
        // Créer le contenu du tableau
        suppliersArray.forEach(supplier => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${supplier.name}</td>
                <td>${supplier.products}</td>
                <td>${supplier.items}</td>
                <td>${supplier.value.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary filter-by-supplier" data-supplier="${supplier.name}">
                        <i class="fas fa-filter"></i>
                    </button>
                </td>
            `;
            
            // Ajouter l'écouteur d'événement pour le filtrage rapide
            row.querySelector('.filter-by-supplier').addEventListener('click', () => {
                this.supplierFilter.value = supplier.name;
                this.activeFilters.supplier = supplier.name;
                this.renderProductsTable();
            });
            
            this.stockSummaryTable.appendChild(row);
        });
    }
    
    /**
     * Affiche le tableau des produits avec tri et filtrage
     */
    renderProductsTable() {
        // Vider le tableau
        this.productsTableBody.innerHTML = '';
        
        // Filtrer les produits selon la recherche et les filtres actifs
        const searchTerm = this.productsSearch.value.toLowerCase();
        let filteredProducts = this.products;
        
        // Filtrer par texte de recherche
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm) || 
                product.brand.toLowerCase().includes(searchTerm) ||
                product.country.toLowerCase().includes(searchTerm) ||
                (product.supplier && product.supplier.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filtrer par fournisseur
        if (this.activeFilters.supplier !== 'all') {
            filteredProducts = filteredProducts.filter(product => 
                product.supplier === this.activeFilters.supplier
            );
        }
        
        // Filtrer par marque
        if (this.activeFilters.brand !== 'all') {
            filteredProducts = filteredProducts.filter(product => 
                product.brand === this.activeFilters.brand
            );
        }
        
        // Filtrer par pays
        if (this.activeFilters.country !== 'all') {
            filteredProducts = filteredProducts.filter(product => 
                product.country === this.activeFilters.country
            );
        }
        
        // Trier les produits
        const sortBy = this.productSortBy.value;
        filteredProducts.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'brand':
                    return a.brand.localeCompare(b.brand);
                case 'country':
                    return a.country.localeCompare(b.country);
                case 'supplier':
                    return (a.supplier || '').localeCompare(b.supplier || '');
                case 'stock':
                    return b.stock - a.stock;
                case 'price':
                    return b.price - a.price;
                case 'value':
                    return (b.price * b.stock) - (a.price * a.stock);
                default:
                    return 0;
            }
        });
        
        // Calculer les totaux filtrés
        let filteredTotalItems = 0;
        let filteredTotalValue = 0;
        
        filteredProducts.forEach(product => {
            filteredTotalItems += product.stock;
            filteredTotalValue += product.stock * product.price;
        });
        
        // Afficher les totaux filtrés si des filtres sont actifs
        if (this.activeFilters.supplier !== 'all' || 
            this.activeFilters.brand !== 'all' || 
            this.activeFilters.country !== 'all' || 
            searchTerm) {
            this.stockItemsTotal.textContent = `${filteredTotalItems} (filtrés sur ${this.stockItemsTotal.dataset.total || '?'})`;
            this.stockValueTotal.textContent = `${filteredTotalValue.toFixed(2)} € (filtrés sur ${this.stockValueTotal.dataset.total || '?'} €)`;
        } else {
            // Stocker les totaux non filtrés
            this.stockItemsTotal.dataset.total = filteredTotalItems;
            this.stockValueTotal.dataset.total = filteredTotalValue.toFixed(2);
            this.stockItemsTotal.textContent = filteredTotalItems;
            this.stockValueTotal.textContent = filteredTotalValue.toFixed(2) + ' €';
        }
        
        // Afficher les produits filtrés et triés
        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            const stockValue = product.stock * product.price;
            
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.brand}</td>
                <td>${product.name}</td>
                <td>${product.country}</td>
                <td>${product.vitole}</td>
                <td>${product.cape || '-'}</td>
                <td>${product.supplier || '-'}</td>
                <td>${product.stock}</td>
                <td>${product.price.toFixed(2)} €</td>
                <td>${stockValue.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            // Ajouter les écouteurs d'événements pour les boutons d'édition et de suppression
            row.querySelector('.edit-product').addEventListener('click', () => this.showEditProductModal(product.id));
            row.querySelector('.delete-product').addEventListener('click', () => this.confirmDeleteProduct(product.id));
            
            this.productsTableBody.appendChild(row);
        });
    }
    
    /**
     * Affiche le modal d'ajout de produit
     */
    showAddProductModal() {
        this.currentEditingId = null;
        this.productModalTitle.textContent = 'Ajouter un nouveau produit';
        this.productForm.reset();
        document.getElementById('productStock').value = 0;
        document.getElementById('productForce').value = 3;
        this.productModal.show();
    }
    
    /**
     * Affiche le modal d'édition de produit
     * @param {number} id - ID du produit à éditer
     */
    async showEditProductModal(id) {
        try {
            const product = await dbManager.getProductById(id);
            if (!product) {
                alert('Produit non trouvé');
                return;
            }
            
            this.currentEditingId = id;
            this.productModalTitle.textContent = 'Modifier le produit';
            
            // Remplir le formulaire avec les données du produit
            document.getElementById('productId').value = product.id;
            document.getElementById('productBrand').value = product.brand || '';
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productCountry').value = product.country || '';
            document.getElementById('productVitole').value = product.vitole || '';
            document.getElementById('productCape').value = product.cape || '';
            document.getElementById('productSousCape').value = product.sousCape || '';
            document.getElementById('productTripe').value = product.tripe || '';
            document.getElementById('productForce').value = product.force || 3;
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productPrice').value = product.price || 0;
            document.getElementById('productSupplier').value = product.supplier || '';
            
            this.productModal.show();
        } catch (error) {
            console.error('Erreur lors du chargement du produit:', error);
            alert('Erreur lors du chargement du produit.');
        }
    }
    
    /**
     * Enregistre le produit (ajout ou modification)
     */
    async saveProduct() {
        // Vérifier la validité du formulaire
        if (!this.productForm.checkValidity()) {
            this.productForm.reportValidity();
            return;
        }
        
        try {
            const productData = {
                brand: document.getElementById('productBrand').value,
                name: document.getElementById('productName').value,
                country: document.getElementById('productCountry').value,
                vitole: document.getElementById('productVitole').value,
                cape: document.getElementById('productCape').value,
                sousCape: document.getElementById('productSousCape').value,
                tripe: document.getElementById('productTripe').value,
                force: parseInt(document.getElementById('productForce').value),
                stock: parseInt(document.getElementById('productStock').value),
                price: parseFloat(document.getElementById('productPrice').value),
                supplier: document.getElementById('productSupplier').value
            };
            
            if (this.currentEditingId) {
                // Mise à jour d'un produit existant
                productData.id = this.currentEditingId;
                await dbManager.updateProduct(productData);
            } else {
                // Ajout d'un nouveau produit
                await dbManager.addProduct(productData);
            }
            
            // Recharger les produits et fermer le modal
            await this.loadProducts();
            this.productModal.hide();
            
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du produit:', error);
            alert('Erreur lors de l\'enregistrement du produit.');
        }
    }
    
    /**
     * Demande confirmation avant de supprimer un produit
     * @param {number} id - ID du produit à supprimer
     */
    confirmDeleteProduct(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
            this.deleteProduct(id);
        }
    }
    
    /**
     * Supprime un produit
     * @param {number} id - ID du produit à supprimer
     */
    async deleteProduct(id) {
        try {
            await dbManager.deleteProduct(id);
            await this.loadProducts();
        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            alert('Erreur lors de la suppression du produit.');
        }
    }
    
    /**
     * Demande confirmation avant de réinitialiser tout le stock
     */
    confirmResetStock() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser tout le stock? Cette action mettra toutes les quantités à zéro.')) {
            this.resetStock();
        }
    }
    
    /**
     * Réinitialise tout le stock (met toutes les quantités à zéro)
     */
    async resetStock() {
        try {
            await dbManager.resetAllStock();
            await this.loadProducts();
            alert('Stock réinitialisé avec succès.');
        } catch (error) {
            console.error('Erreur lors de la réinitialisation du stock:', error);
            alert('Erreur lors de la réinitialisation du stock.');
        }
    }
    
    /**
     * Demande confirmation avant de supprimer tous les produits
     */
    confirmDeleteAllProducts() {
        if (confirm('Êtes-vous sûr de vouloir supprimer TOUS les produits? Cette action est irréversible.')) {
            if (confirm('ATTENTION: Tous les produits seront définitivement supprimés. Confirmer?')) {
                this.deleteAllProducts();
            }
        }
    }
    
    /**
     * Supprime tous les produits
     */
    async deleteAllProducts() {
        try {
            await dbManager.deleteAllProducts();
            await this.loadProducts();
            alert('Tous les produits ont été supprimés.');
        } catch (error) {
            console.error('Erreur lors de la suppression de tous les produits:', error);
            alert('Erreur lors de la suppression de tous les produits.');
        }
    }
    
    /**
     * Affiche le modal d'importation Excel
     */
    showImportModal() {
        document.getElementById('excelFileInput').value = '';
        document.getElementById('importPreview').innerHTML = '';
        const importModal = new bootstrap.Modal(document.getElementById('importExcelModal'));
        importModal.show();
    }
    
    /**
     * Gère la sélection d'un fichier Excel pour l'importation
     * @param {Event} event - Événement de changement de fichier
     */
    async handleExcelFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const preview = document.getElementById('importPreview');
            preview.innerHTML = '<div class="alert alert-info">Analyse du fichier en cours...</div>';
            
            // Lire le fichier Excel
            const data = await this.readExcelFile(file);
            
            if (!data || !data.length) {
                preview.innerHTML = '<div class="alert alert-danger">Le fichier ne contient pas de données valides.</div>';
                return;
            }
            
            // Afficher un aperçu des 5 premières lignes
            let previewHTML = '<h5>Aperçu des données:</h5>';
            previewHTML += '<div class="table-responsive"><table class="table table-sm"><thead><tr>';
            
            // En-têtes
            const headers = Object.keys(data[0]);
            headers.forEach(header => {
                previewHTML += `<th>${header}</th>`;
            });
            
            previewHTML += '</tr></thead><tbody>';
            
            // Lignes de données (max 5)
            const previewRows = data.slice(0, 5);
            previewRows.forEach(row => {
                previewHTML += '<tr>';
                headers.forEach(header => {
                    previewHTML += `<td>${row[header] !== undefined ? row[header] : ''}</td>`;
                });
                previewHTML += '</tr>';
            });
            
            previewHTML += '</tbody></table></div>';
            previewHTML += `<p><strong>Total:</strong> ${data.length} produits à importer</p>`;
            
            preview.innerHTML = previewHTML;
            
            // Stocker les données pour l'importation
            this.excelData = data;
            
        } catch (error) {
            console.error('Erreur lors de la lecture du fichier Excel:', error);
            document.getElementById('importPreview').innerHTML = 
                `<div class="alert alert-danger">Erreur lors de la lecture du fichier: ${error.message}</div>`;
        }
    }
    
    /**
     * Lit un fichier Excel et retourne les données
     * @param {File} file - Fichier Excel à lire
     * @returns {Promise<Array>} - Promesse contenant un tableau de données
     */
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Prendre la première feuille
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertir en JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Importe les données Excel dans la base de données
     */
    async importExcelData() {
        if (!this.excelData || !this.excelData.length) {
            alert('Aucune donnée à importer');
            return;
        }
        
        try {
            // Transformer les données pour correspondre au format de notre base de données
            const productsToImport = this.excelData.map(row => {
                // Normaliser les noms de colonnes pour correspondre à notre structure
                return {
                    brand: row.Marque || row.brand || '',
                    name: row.Nom || row.Name || row.name || '',
                    country: row.Pays || row.Country || row.country || '',
                    vitole: row.Vitole || row.vitole || '',
                    cape: row.Cape || row.cape || '',
                    sousCape: row.SousCape || row['Sous-cape'] || row.sousCape || '',
                    tripe: row.Tripe || row.tripe || '',
                    force: parseInt(row.Force || row.force || 3),
                    stock: parseInt(row.Stock || row.stock || 0),
                    price: parseFloat(row.Prix || row.Price || row.price || 0),
                    supplier: row.Fournisseur || row.Supplier || row.supplier || ''
                };
            });
            
            // Ajouter chaque produit
            let addedCount = 0;
            for (const product of productsToImport) {
                await dbManager.addProduct(product);
                addedCount++;
            }
            
            // Fermer le modal et recharger les produits
            bootstrap.Modal.getInstance(document.getElementById('importExcelModal')).hide();
            await this.loadProducts();
            
            alert(`Importation réussie: ${addedCount} produits importés.`);
            
        } catch (error) {
            console.error('Erreur lors de l\'importation des données:', error);
            alert(`Erreur lors de l'importation: ${error.message}`);
        }
    }
    
    /**
     * Exporte les produits vers un fichier Excel
     */
    async exportProductsToExcel() {
        try {
            const products = await dbManager.getAllProducts();
            
            if (!products.length) {
                alert('Aucun produit à exporter');
                return;
            }
            
            // Créer une feuille de calcul
            const worksheet = XLSX.utils.json_to_sheet(products);
            
            // Créer un classeur
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Produits');
            
            // Générer le fichier Excel
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Télécharger le fichier
            const fileName = `cigares_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            saveAs(blob, fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'exportation des produits:', error);
            alert('Erreur lors de l\'exportation des produits.');
        }
    }
    
    /**
     * Récupère un produit par son ID
     * @param {number} id - ID du produit
     * @returns {Promise<Object>} - Promesse contenant le produit
     */
    async getProductById(id) {
        return await dbManager.getProductById(id);
    }
    
    /**
     * Met à jour le stock d'un produit
     * @param {number} id - ID du produit
     * @param {number} newStock - Nouvelle quantité en stock
     */
    async updateProductStock(id, newStock) {
        await dbManager.updateProductStock(id, newStock);
        await this.loadProducts();
    }
}

// Exporter le gestionnaire de produits
const productManager = new ProductManager();