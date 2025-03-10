/**
 * Gestion des étiquettes avec QR Codes pour l'application CigarManager
 * Permet de générer et d'imprimer des étiquettes pour les cigares
 */

class LabelsManager {
    constructor() {
        // Éléments DOM
        this.labelsSearch = document.getElementById('labelsSearch');
        this.labelsProductList = document.getElementById('labelsProductList');
        this.labelsPreview = document.getElementById('labelsPreview');
        this.previewLabelsBtn = document.getElementById('previewLabelsBtn');
        this.printLabelsBtn = document.getElementById('printLabelsBtn');
        
        // État
        this.products = [];
        this.selectedProducts = [];
        this.maxLabelsPerPage = 8; // 8 étiquettes par page A4
        
        // Initialiser les événements
        this.initEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        // Recherche de produits
        this.labelsSearch.addEventListener('input', () => this.filterProducts());
        
        // Boutons d'action
        this.previewLabelsBtn.addEventListener('click', () => this.previewLabels());
        this.printLabelsBtn.addEventListener('click', () => this.printLabels());
    }
    
    /**
     * Charge les produits pour la génération d'étiquettes
     */
    async loadProducts() {
        try {
            this.products = await dbManager.getAllProducts();
            this.renderProductsList();
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            alert('Erreur lors du chargement des produits.');
        }
    }
    
    /**
     * Filtre les produits selon la recherche
     */
    filterProducts() {
        const searchTerm = this.labelsSearch.value.toLowerCase();
        this.renderProductsList(searchTerm);
    }
    
    /**
     * Affiche la liste des produits pour la sélection
     * @param {string} searchTerm - Terme de recherche (optionnel)
     */
    renderProductsList(searchTerm = '') {
        // Vider la liste
        this.labelsProductList.innerHTML = '';
        
        // Filtrer les produits selon la recherche
        let filteredProducts = this.products;
        if (searchTerm) {
            filteredProducts = this.products.filter(product => 
                product.name.toLowerCase().includes(searchTerm) || 
                product.brand.toLowerCase().includes(searchTerm) ||
                product.country.toLowerCase().includes(searchTerm)
            );
        }
        
        // Trier par marque puis nom
        filteredProducts.sort((a, b) => {
            const brandCompare = a.brand.localeCompare(b.brand);
            return brandCompare !== 0 ? brandCompare : a.name.localeCompare(b.name);
        });
        
        if (filteredProducts.length === 0) {
            this.labelsProductList.innerHTML = '<div class="text-center p-3">Aucun produit trouvé</div>';
            return;
        }
        
        // Afficher chaque produit
        filteredProducts.forEach(product => {
            const isSelected = this.selectedProducts.includes(product.id);
            
            const item = document.createElement('div');
            item.className = `label-product-item ${isSelected ? 'selected' : ''}`;
            item.dataset.id = product.id;
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${product.brand} ${product.name}</div>
                        <div class="small text-muted">
                            ${product.country} | ${product.vitole} | ${product.price.toFixed(2)} €
                        </div>
                    </div>
                    <div>
                        <i class="fas ${isSelected ? 'fa-check-square text-primary' : 'fa-square'}"></i>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => this.toggleProductSelection(product.id));
            
            this.labelsProductList.appendChild(item);
        });
    }
    
    /**
     * Alterne la sélection d'un produit
     * @param {number} productId - ID du produit à sélectionner/désélectionner
     */
    toggleProductSelection(productId) {
        const index = this.selectedProducts.indexOf(productId);
        
        if (index === -1) {
            // Ajouter à la sélection
            this.selectedProducts.push(productId);
        } else {
            // Retirer de la sélection
            this.selectedProducts.splice(index, 1);
        }
        
        // Mettre à jour l'affichage
        this.renderProductsList(this.labelsSearch.value.toLowerCase());
    }
    
    /**
     * Génère un aperçu des étiquettes sélectionnées
     */
    async previewLabels() {
        if (this.selectedProducts.length === 0) {
            alert('Veuillez sélectionner au moins un produit');
            return;
        }
        
        try {
            // Récupérer les détails des produits sélectionnés
            const selectedProductsDetails = [];
            
            for (const productId of this.selectedProducts) {
                const product = await dbManager.getProductById(productId);
                if (product) {
                    selectedProductsDetails.push(product);
                }
            }
            
            // Générer l'aperçu
            this.renderLabelsPreview(selectedProductsDetails);
            
        } catch (error) {
            console.error('Erreur lors de la génération de l\'aperçu:', error);
            alert('Erreur lors de la génération de l\'aperçu.');
        }
    }
    
    /**
     * Affiche l'aperçu des étiquettes avec une mise en page optimisée
     * @param {Array} products - Produits à afficher
     */
    renderLabelsPreview(products) {
        // Déterminer le nombre de pages nécessaires
        const numberOfPages = Math.ceil(products.length / this.maxLabelsPerPage);
        
        // Vider l'aperçu
        this.labelsPreview.innerHTML = '';
        
        // Générer chaque page
        for (let pageIndex = 0; pageIndex < numberOfPages; pageIndex++) {
            const pageProducts = products.slice(
                pageIndex * this.maxLabelsPerPage,
                (pageIndex + 1) * this.maxLabelsPerPage
            );
            
            const page = document.createElement('div');
            page.className = 'a4-sheet mb-4';
            
            const labelGrid = document.createElement('div');
            labelGrid.className = 'label-grid';
            
            // Générer les étiquettes pour cette page
            for (let i = 0; i < this.maxLabelsPerPage; i++) {
                const labelContainer = document.createElement('div');
                
                if (i < pageProducts.length) {
                    // Étiquette avec produit
                    const product = pageProducts[i];
                    labelContainer.className = 'label-container';
                    labelContainer.innerHTML = this.generateLabelHTML(product);
                } else {
                    // Étiquette vide (placeholder)
                    labelContainer.className = 'label-placeholder';
                    labelContainer.textContent = 'Étiquette vide';
                }
                
                labelGrid.appendChild(labelContainer);
            }
            
            page.appendChild(labelGrid);
            this.labelsPreview.appendChild(page);
        }
    }
    
    /**
     * Génère le HTML d'une étiquette avec un design haut de gamme simplifié
     * @param {Object} product - Produit pour l'étiquette
     * @returns {string} - HTML de l'étiquette
     */
    generateLabelHTML(product) {
        // Générer le QR Code
        const qrCanvas = document.createElement('canvas');
        const qrCode = new QRious({
            element: qrCanvas,
            value: product.id.toString(),
            size: 120,
            backgroundAlpha: 0
        });
        
        const qrCodeImage = qrCode.toDataURL();
        
        // Convertir la force en étoiles
        const forceStars = this.generateForceStars(product.force);
        
        // Traiter et tronquer les textes longs si nécessaire
        const brand = this.truncateText(product.brand, 15);
        const name = this.truncateText(product.name, 20);
        const country = this.truncateText(product.country, 15);
        const vitole = this.truncateText(product.vitole, 20);
        const cape = this.truncateText(product.cape || 'N/A', 20);
        const sousCape = this.truncateText(product.sousCape || 'N/A', 20);
        const tripe = this.truncateText(product.tripe || 'N/A', 20);
        
        // Structure de l'étiquette avec style premium simplifié
        return `
            <div class="premium-label">
                <div class="label-header">
                    <div class="label-brand">${brand}</div>
                    <div class="label-name">${name}</div>
                    <div class="label-country">${country}</div>
                </div>
                
                <div class="label-main-content">
                    <div class="label-info">
                        <div class="label-vitole-container">
                            <span class="info-label">Vitole:</span>
                            <span class="info-value">${vitole}</span>
                        </div>
                        
                        <div class="label-composition">
                            <div class="composition-item">
                                <span class="info-label">Cape:</span>
                                <span class="info-value">${cape}</span>
                            </div>
                            <div class="composition-item">
                                <span class="info-label">Sous-cape:</span>
                                <span class="info-value">${sousCape}</span>
                            </div>
                            <div class="composition-item">
                                <span class="info-label">Tripe:</span>
                                <span class="info-value">${tripe}</span>
                            </div>
                        </div>
                        
                        <div class="label-force">
                            <span class="info-label">Force:</span>
                            <div class="force-stars">${forceStars}</div>
                        </div>
                    </div>
                    
                    <div class="label-qrcode">
                        <img src="${qrCodeImage}" alt="QR Code">
                    </div>
                </div>
                
                <div class="label-footer">
                    <div class="label-price-container">
                        <span class="price-currency">€</span>
                        <span class="price-value">${product.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Génère l'indicateur de force avec des étoiles
     * @param {number} force - Niveau de force (1-5)
     * @returns {string} - HTML des étoiles
     */
    generateForceStars(force) {
        force = parseInt(force) || 3; // Valeur par défaut si non définie
        force = Math.min(Math.max(force, 1), 5); // Limiter entre 1 et 5
        
        let html = '';
        
        for (let i = 1; i <= 5; i++) {
            const filled = i <= force;
            html += `<span class="force-star ${filled ? 'filled' : 'empty'}"><i class="fas fa-star"></i></span>`;
        }
        
        return html;
    }
    /**
     * Tronque un texte s'il dépasse une certaine longueur
     * @param {string} text - Texte à tronquer
     * @param {number} maxLength - Longueur maximale
     * @returns {string} - Texte tronqué
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * Imprime les étiquettes sélectionnées avec les styles optimisés
     */
    printLabels() {
        if (this.selectedProducts.length === 0) {
            alert('Veuillez sélectionner au moins un produit');
            return;
        }
        
        // Ajouter des styles d'impression corrects
        const printStyles = `
            <style>
                @page {
                    size: A4;
                    margin: 0;
                }
                
                body {
                    margin: 0;
                    padding: 0;
                }
                
                body * {
                    visibility: hidden;
                }
                
                .a4-sheet, .a4-sheet * {
                    visibility: visible;
                }
                
                .a4-sheet {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    page-break-after: always;
                }
                
                .label-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    grid-gap: 5mm;
                    padding: 10mm;
                    box-sizing: border-box;
                }
                
                .label-container {
                    box-sizing: border-box;
                    page-break-inside: avoid !important;
                }
                
                .premium-label {
                    border: 1px solid #8B4513 !important;
                    background-color: #fff !important;
                    color: #333 !important;
                    box-sizing: border-box !important;
                    padding: 5mm !important;
                    height: 63mm !important;
                    width: 100% !important;
                    overflow: hidden !important;
                }
                
                .label-brand {
                    color: #8B4513 !important;
                    font-size: 14pt !important;
                }
                
                .label-price-container {
                    background-color: #8B4513 !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .force-star.filled {
                    color: #8B4513 !important;
                }
                
                .info-label {
                    color: #8B4513 !important;
                }
            </style>
        `;
        
        // Inclure les polices pour l'impression
        const fontLinks = `
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        `;
        
        // Créer une fenêtre d'impression
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Impression d'étiquettes</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${fontLinks}
                ${printStyles}
            </head>
            <body>
                ${this.labelsPreview.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 750);
                        }, 750);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
}

// Exporter le gestionnaire d'étiquettes
const labelsManager = new LabelsManager();