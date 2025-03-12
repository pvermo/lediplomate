/**
 * Gestion des ventes pour l'application CigarManager
 * Gère le panier, les ventes, le scanner QR, etc.
 */

class SalesManager {
    constructor() {
        // Éléments DOM
        this.cartItems = document.getElementById('cartItems');
        this.cartTotal = document.getElementById('cartTotal');
        this.validateSaleBtn = document.getElementById('validateSaleBtn');
        this.cancelSaleBtn = document.getElementById('cancelSaleBtn');
        this.salesProductSearch = document.getElementById('salesProductSearch');
        this.cartSortBy = document.getElementById('cartSortBy');
        this.manualAddBtn = document.getElementById('manualAddBtn');
        this.toggleScannerBtn = document.getElementById('toggleScannerBtn');
        
        // QR Scanner
        this.qrScannerModal = document.getElementById('qrScannerModal');
        this.closeQrScannerBtn = document.getElementById('closeQrScannerBtn');
        this.qrScanner = null;
        this.html5QrCode = null;
        
        // Modal d'ajout manuel
        this.manualAddModal = new bootstrap.Modal(document.getElementById('manualAddModal'));
        this.searchManualProduct = document.getElementById('searchManualProduct');
        this.manualProductsList = document.getElementById('manualProductsList');
        
        // État
        this.cart = [];
        this.scannerActive = false;
        this.isScannerReady = false;
        this.sortBy = 'name'; // Tri par défaut
        
        // Initialiser les événements
        this.initEventListeners();
        this.initExternalScanner();
        this.scannerFocusInterval = null;
    }
    cleanupScanner() {
        if (this.scannerFocusInterval) {
            clearInterval(this.scannerFocusInterval);
            this.scannerFocusInterval = null;
        }
    }
    /**
     * Initialise le scanner externe de codes-barres
     */
    initExternalScanner() {
        // Créer un champ caché pour recevoir les entrées du scanner
        const scannerIndicator = document.getElementById('externalScannerIndicator');
        if (scannerIndicator) {
            scannerIndicator.classList.add('active');
        }
        
        // Si l'input existe déjà, ne pas le recréer
        let scannerInput = document.getElementById('externalScannerInput');
        if (!scannerInput) {
            scannerInput = document.createElement('input');
            scannerInput.type = 'text';
            scannerInput.id = 'externalScannerInput';
            scannerInput.setAttribute('autocomplete', 'off');
            scannerInput.style.opacity = '0';
            scannerInput.style.position = 'absolute';
            scannerInput.style.top = '0';
            scannerInput.style.left = '0';
            scannerInput.style.pointerEvents = 'none';
            scannerInput.style.width = '1px';
            scannerInput.style.height = '1px';
            document.body.appendChild(scannerInput);
        }
        
        // Ajouter des gestionnaires d'événements pour debug
        console.log('Scanner input initialized:', scannerInput);
        
        // Gestion du focus
        scannerInput.addEventListener('focus', () => {
            console.log('Scanner input focused');
            if (scannerIndicator) {
                scannerIndicator.classList.add('active');
            }
        });

        scannerInput.addEventListener('blur', () => {
            console.log('Scanner input lost focus');
            if (scannerIndicator) {
                scannerIndicator.classList.remove('active');
            }
            // Essayer de récupérer le focus après un court délai
            setTimeout(() => {
                if (document.getElementById('sales-section').classList.contains('active')) {
                    scannerInput.focus();
                }
            }, 100);
        });
        
        // Capturer les données du scanner
        let scanBuffer = '';
        let scanTimeout = null;
        
        scannerInput.addEventListener('input', (e) => {
            // Ajouter le caractère au buffer
            scanBuffer += e.data || '';
            
            // Réinitialiser le timeout
            clearTimeout(scanTimeout);
            
            // Définir un timeout pour traiter le code après un court délai
            // Cela permet de capturer des codes qui n'envoient pas forcément d'Entrée
            scanTimeout = setTimeout(() => {
                if (scanBuffer.length > 0) {
                    console.log('Processing scan buffer:', scanBuffer);
                    this.processScanCode(scanBuffer);
                    scanBuffer = '';
                }
            }, 50); // Délai court pour les scanners rapides
        });
        
        // Gérer la touche Entrée explicitement
        scannerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Empêcher le formulaire de s'envoyer
                console.log('Enter key pressed with value:', scannerInput.value);
                
                clearTimeout(scanTimeout);
                
                if (scannerInput.value) {
                    this.processScanCode(scannerInput.value);
                    scannerInput.value = '';
                    scanBuffer = '';
                } else if (scanBuffer) {
                    this.processScanCode(scanBuffer);
                    scanBuffer = '';
                }
            }
        });
        
        // S'assurer que le champ garde le focus périodiquement
        this.scannerFocusInterval = setInterval(() => {
            // Seulement si la section des ventes est active
            if (document.getElementById('sales-section').classList.contains('active')) {
                scannerInput.focus();
                console.log('Refocusing scanner input');
            }
        }, 2000);
        
        // Focus initial
        setTimeout(() => {
            scannerInput.focus();
            console.log('Initial focus set on scanner input');
        }, 500);
    }

    // Nouvelle méthode pour traiter le code scanné
    processScanCode(scannedCode) {
        scannedCode = scannedCode.trim();
        console.log('Processing scanned code:', scannedCode);
        
        if (!scannedCode) return;
        
        // Essayer de convertir en nombre pour l'ID du produit
        try {
            const productId = parseInt(scannedCode);
            
            if (isNaN(productId)) {
                console.error('Code scanné non valide:', scannedCode);
                return;
            }
            
            // Rechercher le produit et l'ajouter au panier
            this.findAndAddProductToCart(productId);
            
        } catch (error) {
            console.error('Erreur lors du traitement du code scanné:', error);
            alert(`Erreur lors du traitement du code scanné: ${error.message}`);
        }
    }

    // Méthode pour rechercher un produit et l'ajouter au panier
    async findAndAddProductToCart(productId) {
        try {
            const product = await productManager.getProductById(productId);
            
            if (!product) {
                alert(`Produit non trouvé avec l'ID: ${productId}`);
                return;
            }
            
            // Vérifier le stock
            if (product.stock <= 0) {
                alert(`${product.brand} ${product.name} n'est plus en stock.`);
                return;
            }
            
            // Ajouter au panier
            this.addToCart(product);
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds')?.checked) {
                this.playSound('success');
            }
            
        } catch (error) {
            console.error('Erreur lors de la recherche du produit:', error);
            alert(`Erreur: ${error.message}`);
        }
    }
    updateSortButtons(activeSort) {
        // Retirer la classe active de tous les boutons
        document.querySelectorAll('.sort-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Ajouter la classe active au bouton sélectionné
        document.getElementById(`sortBy${activeSort.charAt(0).toUpperCase() + activeSort.slice(1)}`).classList.add('active');
    }
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        // Boutons de vente
        this.validateSaleBtn.addEventListener('click', () => this.validateSale());
        this.cancelSaleBtn.addEventListener('click', () => this.clearCart());
        
        // Recherche et tri
        this.salesProductSearch.addEventListener('input', () => this.searchProducts());
        document.getElementById('sortByName').addEventListener('click', () => {
            this.sortBy = 'name';
            this.updateSortButtons('name');
            this.renderCart();
        });
        
        document.getElementById('sortByBrand').addEventListener('click', () => {
            this.sortBy = 'brand';
            this.updateSortButtons('brand');
            this.renderCart();
        });
        
        document.getElementById('sortByCountry').addEventListener('click', () => {
            this.sortBy = 'country';
            this.updateSortButtons('country');
            this.renderCart();
        });
        
        document.getElementById('sortBySupplier').addEventListener('click', () => {
            this.sortBy = 'supplier';
            this.updateSortButtons('supplier');
            this.renderCart();
        });        
        // QR Scanner
        this.toggleScannerBtn.addEventListener('click', () => this.toggleQrScanner());
        this.closeQrScannerBtn.addEventListener('click', () => this.closeQrScanner());
        
        // Ajout manuel
        this.manualAddBtn.addEventListener('click', () => this.showManualAddModal());
        this.searchManualProduct.addEventListener('input', () => this.renderManualProductsList());
        
        // Raccourci clavier pour valider la vente (Entrée)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT' && 
                document.getElementById('sales-section').classList.contains('active')) {
                this.validateSale();
            }
        });
    }
    
    /**
     * Initialise le scanner QR
     */
    initQrScanner() {
        if (this.isScannerReady) return;
        
        const qrScannerElement = document.getElementById('qrScanner');
        
        this.html5QrCode = new Html5Qrcode("qrScannerContainer");
        
        this.html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                this.handleQrCodeScan(decodedText);
                
                // Fermer automatiquement le scanner si l'option est activée
                if (document.getElementById('autoCloseQrScanner').checked) {
                    this.closeQrScanner();
                }
            },
            (errorMessage) => {
                // Ignorer les erreurs de scan (pas besoin de les afficher)
            }
        ).catch((err) => {
            console.error("Erreur lors de l'initialisation du scanner QR:", err);
        });
        
        this.isScannerReady = true;
    }
    
    /**
     * Affiche ou masque le scanner QR
     */
    toggleQrScanner() {
        if (this.scannerActive) {
            this.closeQrScanner();
        } else {
            this.openQrScanner();
        }
    }
    
    /**
     * Ouvre le scanner QR
     */
    openQrScanner() {
        this.qrScannerModal.classList.add('show');
        this.scannerActive = true;
        this.initQrScanner();
    }
    
    /**
     * Ferme le scanner QR
     */
    closeQrScanner() {
        this.qrScannerModal.classList.remove('show');
        this.scannerActive = false;
        
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            this.html5QrCode.stop().catch(error => {
                console.error("Erreur lors de l'arrêt du scanner QR:", error);
            });
        }
    }
    
    /**
     * Gère le scan d'un QR code
     * @param {string} qrCode - Contenu du QR code scanné
     */
    async handleQrCodeScan(qrCode) {
        try {
            // Supposons que le QR code contient l'ID du produit
            const productId = parseInt(qrCode);
            
            if (isNaN(productId)) {
                alert('QR Code invalide');
                return;
            }
            
            const product = await productManager.getProductById(productId);
            
            if (!product) {
                alert('Produit non trouvé');
                return;
            }
            
            // Vérifier le stock
            if (product.stock <= 0) {
                alert(`${product.brand} ${product.name} n'est plus en stock.`);
                return;
            }
            
            // Ajouter au panier
            this.addToCart(product);
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('success');
            }
            
        } catch (error) {
            console.error('Erreur lors du traitement du QR code:', error);
            alert('Erreur lors du traitement du QR code.');
        }
    }
    
    /**
     * Affiche le modal d'ajout manuel de produit
     */
    showManualAddModal() {
        this.searchManualProduct.value = '';
        this.renderManualProductsList();
        this.manualAddModal.show();
    }
    
    /**
     * Affiche la liste des produits pour l'ajout manuel
     */
    async renderManualProductsList() {
        try {
            this.manualProductsList.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
            
            const products = await dbManager.getAllProducts();
            const searchTerm = this.searchManualProduct.value.toLowerCase();
            
            // Filtrer les produits selon la recherche
            let filteredProducts = products;
            if (searchTerm) {
                filteredProducts = products.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) || 
                    product.brand.toLowerCase().includes(searchTerm) ||
                    product.country.toLowerCase().includes(searchTerm)
                );
            }
            
            // Ne montrer que les produits en stock
            filteredProducts = filteredProducts.filter(product => product.stock > 0);
            
            // Trier par marque puis nom
            filteredProducts.sort((a, b) => {
                const brandCompare = a.brand.localeCompare(b.brand);
                return brandCompare !== 0 ? brandCompare : a.name.localeCompare(b.name);
            });
            
            // Vider la liste
            this.manualProductsList.innerHTML = '';
            
            if (filteredProducts.length === 0) {
                this.manualProductsList.innerHTML = '<div class="text-center p-3">Aucun produit trouvé</div>';
                return;
            }
            
            // Afficher les produits filtrés
            filteredProducts.forEach(product => {
                const item = document.createElement('div');
                item.className = 'manual-product-item';
                item.innerHTML = `
                    <div class="manual-product-name">${product.brand} ${product.name}</div>
                    <div class="manual-product-details">
                        ${product.country} | ${product.vitole} | ${product.price.toFixed(2)} € | Stock: ${product.stock}
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    this.addToCart(product);
                    this.manualAddModal.hide();
                    
                    // Jouer un son si l'option est activée
                    if (document.getElementById('enableSounds').checked) {
                        this.playSound('success');
                    }
                });
                
                this.manualProductsList.appendChild(item);
            });
            
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            this.manualProductsList.innerHTML = '<div class="text-center p-3 text-danger">Erreur lors du chargement des produits</div>';
        }
    }
    
    /**
     * Recherche des produits pour l'ajout direct au panier
     */
    async searchProducts() {
        const searchTerm = this.salesProductSearch.value.toLowerCase();
        
        if (!searchTerm || searchTerm.length < 2) {
            return;
        }
        
        try {
            const products = await dbManager.getAllProducts();
            
            // Filtrer les produits selon la recherche
            const filteredProducts = products.filter(product => 
                (product.name.toLowerCase().includes(searchTerm) || 
                product.brand.toLowerCase().includes(searchTerm)) &&
                product.stock > 0
            );
            
            // Si un seul produit correspond exactement, l'ajouter au panier
            if (filteredProducts.length === 1) {
                this.addToCart(filteredProducts[0]);
                this.salesProductSearch.value = '';
                
                // Jouer un son si l'option est activée
                if (document.getElementById('enableSounds').checked) {
                    this.playSound('success');
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de la recherche de produits:', error);
        }
    }
    
    /**
     * Ajoute un produit au panier
     * @param {Object} product - Produit à ajouter
     */
    addToCart(product) {
        // Vérifier si le produit est déjà dans le panier
        const existingItem = this.cart.find(item => item.product.id === product.id);
        
        if (existingItem) {
            // Ne pas dépasser le stock disponible
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                alert(`Stock maximum atteint pour ${product.brand} ${product.name}`);
                return;
            }
        } else {
            this.cart.push({
                product: product,
                quantity: 1
            });
        }
        
        this.renderCart();
    }
    
    /**
     * Retire un produit du panier
     * @param {number} productId - ID du produit à retirer
     */
    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.product.id === productId);
        
        if (index !== -1) {
            this.cart.splice(index, 1);
            this.renderCart();
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('delete');
            }
        }
    }
    
    /**
     * Change la quantité d'un produit dans le panier
     * @param {number} productId - ID du produit
     * @param {number} delta - Changement de quantité (+1 ou -1)
     */
    changeQuantity(productId, delta) {
        const item = this.cart.find(item => item.product.id === productId);
        
        if (!item) return;
        
        const newQuantity = item.quantity + delta;
        
        if (newQuantity <= 0) {
            // Si la quantité devient 0 ou moins, retirer l'article
            this.removeFromCart(productId);
        } else if (newQuantity <= item.product.stock) {
            // Ne pas dépasser le stock disponible
            item.quantity = newQuantity;
            this.renderCart();
        } else {
            alert(`Stock maximum atteint pour ${item.product.brand} ${item.product.name}`);
        }
    }
    
    /**
     * Méthode améliorée pour afficher le contenu du panier avec des sous-totaux par catégorie
     * et le stock disponible pour chaque produit
     */
    renderCart() {
        // Vider le panier visuel
        this.cartItems.innerHTML = '';
        
        if (this.cart.length === 0) {
            this.cartItems.innerHTML = '<div class="text-center p-4">Le panier est vide</div>';
            this.cartTotal.textContent = '0.00 €';
            return;
        }
        
        // Trier les articles du panier
        const sortBy = this.sortBy || 'name';
        this.cart.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.product.name.localeCompare(b.product.name);
                case 'brand':
                    return a.product.brand.localeCompare(b.product.brand);
                case 'country':
                    return a.product.country.localeCompare(b.product.country);
                case 'supplier':
                    return (a.product.supplier || '').localeCompare(b.product.supplier || '');
                default:
                    return 0;
            }
        });
        
        // Calculer le total général
        let grandTotal = 0;
        
        // Grouper les articles par catégorie sélectionnée
        const groupedItems = {};
        let currentCategory = '';
        
        this.cart.forEach(item => {
            let categoryKey = '';
            
            // Déterminer la catégorie selon le tri
            switch (sortBy) {
                case 'name':
                    categoryKey = item.product.name.charAt(0).toUpperCase(); // Premier caractère du nom
                    break;
                case 'brand':
                    categoryKey = item.product.brand;
                    break;
                case 'country':
                    categoryKey = item.product.country;
                    break;
                case 'supplier':
                    categoryKey = item.product.supplier || 'Non spécifié';
                    break;
                default:
                    categoryKey = 'Tous les produits';
            }
            
            // Initialiser la catégorie si elle n'existe pas
            if (!groupedItems[categoryKey]) {
                groupedItems[categoryKey] = {
                    items: [],
                    subtotal: 0
                };
            }
            
            // Ajouter l'article à la catégorie
            groupedItems[categoryKey].items.push(item);
            
            // Calculer le sous-total
            const subtotal = item.quantity * item.product.price;
            groupedItems[categoryKey].subtotal += subtotal;
            
            // Calculer le total général
            grandTotal += subtotal;
        });
        
        // Afficher les articles groupés par catégorie
        Object.keys(groupedItems).sort().forEach(categoryKey => {
            const categoryGroup = groupedItems[categoryKey];
            
            // Créer un en-tête de catégorie si le groupement est actif
            if (sortBy !== 'default') {
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'cart-category-header';
                categoryHeader.innerHTML = `
                    <div class="category-name">${categoryKey}</div>
                    <div class="category-subtotal">Sous-total: ${categoryGroup.subtotal.toFixed(2)} €</div>
                `;
                this.cartItems.appendChild(categoryHeader);
            }
            
            // Afficher chaque article de la catégorie
            categoryGroup.items.forEach(item => {
                const subtotal = item.quantity * item.product.price;
                
                // Calculer le stock restant (stock actuel moins la quantité dans le panier)
                const stockRestant = item.product.stock - item.quantity;
                
                // Définir la classe de stock en fonction du niveau restant
                let stockClass = '';
                if (stockRestant <= 0) {
                    stockClass = 'text-danger fw-bold'; // Rouge et gras pour stock épuisé
                } else if (stockRestant <= 5) {
                    stockClass = 'text-warning'; // Orange pour stock faible
                } else {
                    stockClass = 'text-success'; // Vert pour stock normal
                }
                
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                
                cartItem.innerHTML = `
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.product.brand} ${item.product.name}</div>
                        <div class="cart-item-details">
                            ${item.product.country} | ${item.product.vitole} | ${item.product.price.toFixed(2)} €
                            <span class="ms-2 ${stockClass}">
                                <i class="fas fa-cubes"></i> Stock: ${stockRestant}
                            </span>
                        </div>
                    </div>
                    <div class="cart-item-price">${subtotal.toFixed(2)} €</div>
                    <div class="cart-item-actions">
                        <button class="btn btn-sm btn-outline-secondary decrease-quantity">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary increase-quantity" ${stockRestant <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger remove-item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // Ajouter les écouteurs d'événements
                cartItem.querySelector('.decrease-quantity').addEventListener('click', () => {
                    this.changeQuantity(item.product.id, -1);
                });
                
                cartItem.querySelector('.increase-quantity').addEventListener('click', () => {
                    this.changeQuantity(item.product.id, 1);
                });
                
                cartItem.querySelector('.remove-item').addEventListener('click', () => {
                    this.removeFromCart(item.product.id);
                });
                
                this.cartItems.appendChild(cartItem);
            });
        });
        
        // Mettre à jour le total général
        this.cartTotal.textContent = `${grandTotal.toFixed(2)} €`;
    }
    
    /**
     * Vide le panier
     */
    clearCart() {
        this.cart = [];
        this.renderCart();
    }
    
    /**
     * Valide la vente et met à jour le stock
     */
    async validateSale() {
        if (this.cart.length === 0) {
            alert('Le panier est vide');
            return;
        }
        
        try {
            // Calculer le total
            let total = 0;
            this.cart.forEach(item => {
                total += item.quantity * item.product.price;
            });
            
            // Créer l'objet vente
            const sale = {
                date: new Date().toISOString(),
                items: this.cart.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    productBrand: item.product.brand,
                    quantity: item.quantity,
                    price: item.product.price,
                    subtotal: item.quantity * item.product.price
                })),
                total: total
            };
            
            // Enregistrer la vente
            await dbManager.addSale(sale);
            
            // Mettre à jour le stock
            for (const item of this.cart) {
                const newStock = item.product.stock - item.quantity;
                await productManager.updateProductStock(item.product.id, newStock);
            }
            
            // Jouer un son si l'option est activée
            if (document.getElementById('enableSounds').checked) {
                this.playSound('success');
            }
            
            // Vider le panier
            this.clearCart();
            
            // Recharger les produits pour mettre à jour l'affichage
            await productManager.loadProducts();
            // Mettre à jour les totaux du stock même si on n'est pas dans l'onglet produits
            productManager.calculateStockTotals();
            // Rafraîchir l'historique si la section est active
            if (document.getElementById('history-section').classList.contains('active')) {
                await historyManager.loadSales();
            }
            
        } catch (error) {
            console.error('Erreur lors de la validation de la vente:', error);
            alert('Erreur lors de la validation de la vente.');
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

// Exporter le gestionnaire de ventes
const salesManager = new SalesManager();