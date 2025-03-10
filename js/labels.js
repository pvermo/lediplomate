/**
 * Gestion des étiquettes avec QR Codes pour l'application CigarManager
 * Permet de générer et d'imprimer des étiquettes pour les cigares
 * Version corrigée avec prix visible et QR code bien dimensionné
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
                labelContainer.innerHTML = this.generatePreviewLabelHTML(product);
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
 * Génère le HTML d'une étiquette pour l'aperçu avec la nouvelle mise en page
 * @param {Object} product - Produit pour l'étiquette
 * @returns {string} - HTML de l'étiquette
 */
generatePreviewLabelHTML(product) {
    // Générer le QR Code
    const qrCanvas = document.createElement('canvas');
    const qrCode = new QRious({
        element: qrCanvas,
        value: product.id.toString(),
        size: 100,
        backgroundAlpha: 0
    });
    
    const qrCodeImage = qrCode.toDataURL();
    
    // Traiter et tronquer les textes longs si nécessaire
    const brand = this.truncateText(product.brand, 15);
    const name = this.truncateText(product.name, 20);
    const country = this.truncateText(product.country, 40);
    const vitole = this.truncateText(product.vitole, 20);
    const cape = this.truncateText(product.cape || 'N/A', 20);
    const sousCape = this.truncateText(product.sousCape || 'N/A', 20);
    const tripe = this.truncateText(product.tripe || 'N/A', 40);
    const formattedPrice = product.price.toFixed(2);
    
    // Générer l'indicateur de force
    const forceStars = this.generateForceStars(product.force);
    
    // Version alignée avec la fonction d'impression
    return `
        <div class="premium-label">
            <div class="label-header">
                <div class="label-brand">${brand}</div>
                <div class="label-name">${name}</div>
                <div class="label-country">${country}</div>
            </div>
            
            <div class="label-main-content">
                <div class="label-info">
                    <!-- Caractéristiques du cigare avec une mise en forme plus claire -->
                    <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Vitole:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${vitole}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Cape:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${cape}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Sous-cape:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${sousCape}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Tripe:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${tripe}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%;">Force:</td>
                            <td>${forceStars}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="label-qrcode">
                    <img src="${qrCodeImage}" alt="QR Code" style="max-width: 100%; max-height: 100%;">
                </div>
            </div>
            
            <div class="label-footer" style="position: absolute; bottom: 5mm; right: 5mm; text-align: right;">
                <div class="label-price-container" style="display: inline-flex; background-color: #8B4513; color: white; padding: 1mm 3mm; border-radius: 2px;">
                    <span class="price-currency" style="font-size: 8pt; margin-right: 0.5mm; color: white;">€</span>
                    <span class="price-value" style="font-size: 10pt; font-weight: bold; color: white;">${formattedPrice}</span>
                </div>
            </div>
        </div>
    `;
}
    
    /**
     * Génère le HTML d'une étiquette avec un design haut de gamme simplifié
     * @param {Object} product - Produit pour l'étiquette
     * @returns {string} - HTML de l'étiquette
     */
    generateLabelHTML(product) {
        // Générer le QR Code avec une taille réduite
        const qrCanvas = document.createElement('canvas');
        const qrCode = new QRious({
            element: qrCanvas,
            value: product.id.toString(),
            size: 100, // Taille réduite pour s'adapter au conteneur
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
        const formattedPrice = product.price.toFixed(2);
        
        // Version améliorée avec des styles renforcés pour garantir l'affichage du prix
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
                        <img src="${qrCodeImage}" alt="QR Code" style="max-width: 100%; max-height: 100%;">
                    </div>
                </div>
                
                <div class="label-footer" style="display: block !important; text-align: right !important; margin-top: auto !important; position: relative !important; z-index: 100 !important;">
                    <div class="label-price-container" style="display: inline-flex !important; background-color: #8B4513 !important; color: white !important; padding: 2mm 3mm !important; border-radius: 2px !important; visibility: visible !important;">
                        <span class="price-currency" style="color: white !important; font-size: 8pt !important; margin-right: 0.5mm !important; visibility: visible !important; display: inline !important;">€</span>
                        <span class="price-value" style="color: white !important; font-size: 10pt !important; font-weight: bold !important; visibility: visible !important; display: inline !important;">${formattedPrice}</span>
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
     * Version corrigée pour assurer que le prix s'affiche correctement
     */
    renderPrintableLabels() {
    // Récupérer les produits sélectionnés
    const selectedProductsDetails = [];
    
    // Cette partie est synchrone pour les besoins de l'impression directe
    // Note: Dans un contexte réel, cela devrait être fait de manière asynchrone avant d'ouvrir la fenêtre d'impression
    this.selectedProducts.forEach(productId => {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            selectedProductsDetails.push(product);
        }
    });
    
    // Calculer le nombre de pages
    const numberOfPages = Math.ceil(selectedProductsDetails.length / this.maxLabelsPerPage);
    
    // Générer le HTML pour toutes les pages
    let pagesHTML = '';
    
    for (let pageIndex = 0; pageIndex < numberOfPages; pageIndex++) {
        const pageProducts = selectedProductsDetails.slice(
            pageIndex * this.maxLabelsPerPage,
            (pageIndex + 1) * this.maxLabelsPerPage
        );
        
        let gridHTML = '';
        
        // Générer les étiquettes de cette page
        for (let i = 0; i < this.maxLabelsPerPage; i++) {
            if (i < pageProducts.length) {
                gridHTML += this.generatePrintableLabelHTML(pageProducts[i]);
            } else {
                gridHTML += '<div style="height: 63mm; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">Étiquette vide</div>';
            }
        }
        
        pagesHTML += `
            <div class="a4-sheet">
                <div class="label-grid">
                    ${gridHTML}
                </div>
            </div>
        `;
    }
    
    return pagesHTML;
}

renderPlaceholderLabels() {
    // Cette partie est synchrone pour les besoins de l'impression directe
    const selectedProductsDetails = [];
    
    this.selectedProducts.forEach(productId => {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            selectedProductsDetails.push(product);
        }
    });
    
    // Calculer le nombre de pages
    const numberOfPages = Math.ceil(selectedProductsDetails.length / this.maxLabelsPerPage);
    
    // Générer le HTML pour toutes les pages
    let pagesHTML = '';
    
    for (let pageIndex = 0; pageIndex < numberOfPages; pageIndex++) {
        const pageProducts = selectedProductsDetails.slice(
            pageIndex * this.maxLabelsPerPage,
            (pageIndex + 1) * this.maxLabelsPerPage
        );
        
        let gridHTML = '';
        
        // Générer les étiquettes de cette page
        for (let i = 0; i < this.maxLabelsPerPage; i++) {
            if (i < pageProducts.length) {
                gridHTML += this.generatePrintableLabelHTML(pageProducts[i]);
            } else {
                gridHTML += '<div style="height: 63mm; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">Étiquette vide</div>';
            }
        }
        
        pagesHTML += `
            <div class="a4-sheet">
                <div class="label-grid">
                    ${gridHTML}
                </div>
            </div>
        `;
    }
    
    return pagesHTML;
}

// Méthode révisée pour générer le HTML des étiquettes avec QR code et prix bien positionné
// Mise à jour de la méthode generatePrintableLabelHTML avec une meilleure organisation des infos

generatePrintableLabelHTML(product) {
    // Traiter les textes
    const brand = this.truncateText(product.brand, 15);
    const name = this.truncateText(product.name, 20);
    const country = this.truncateText(product.country, 60);
    const vitole = this.truncateText(product.vitole, 20);
    const cape = this.truncateText(product.cape || 'N/A', 20);
    const sousCape = this.truncateText(product.sousCape || 'N/A', 20);
    const tripe = this.truncateText(product.tripe || 'N/A', 40);
    const formattedPrice = product.price.toFixed(2);
    
    // Générer le HTML de l'étoile pour indiquer la force
    let forceStarsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= (product.force || 3);
        forceStarsHTML += `<span style="font-size: 7pt; margin-right: 0.5mm; color: ${filled ? '#8B4513' : '#ddd'}">★</span>`;
    }
    
    // Retourner le HTML de l'étiquette avec une organisation améliorée
    return `
        <div class="premium-label" data-product-id="${product.id}">
            <div class="label-header">
                <div class="label-brand">${brand}</div>
                <div class="label-name">${name}</div>
                <div class="label-country">${country}</div>
            </div>
            
            <div class="label-main-content">
                <div class="label-info">
                    <!-- Caractéristiques du cigare avec une mise en forme plus claire -->
                    <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Vitole:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${vitole}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Cape:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${cape}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Sous-cape:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${sousCape}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%; padding-bottom: 2mm;">Tripe:</td>
                            <td style="color: #333; padding-bottom: 2mm;">${tripe}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600; color: #8B4513; width: 30%;">Force:</td>
                            <td>${forceStarsHTML}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="label-qrcode">
                    <!-- Le QR code sera généré dynamiquement ici -->
                    <div style="font-size: 9pt; color: #777; text-align: center;">QR Code</div>
                </div>
            </div>
            
            <div class="label-footer">
                <div class="label-price">
                    <span style="font-size: 8pt; margin-right: 0.5mm;">€</span>
                    <span style="font-size: 10pt; font-weight: bold;">${formattedPrice}</span>
                </div>
            </div>
        </div>
    `;
}
printLabels() {
    if (this.selectedProducts.length === 0) {
        alert('Veuillez sélectionner au moins un produit');
        return;
    }
    
    // Créer une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    
    // Style d'impression simplifié et direct
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Impression d'étiquettes</title>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
            <style>
                @page { 
                    size: A4; 
                    margin: 0; 
                }
                
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                }
                
                .a4-sheet {
                    width: 210mm;
                    height: 297mm;
                    padding: 10mm;
                    box-sizing: border-box;
                    page-break-after: always;
                }
                
                .label-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    grid-gap: 5mm;
                    height: 100%;
                }
                
                .premium-label {
                    border: 1px solid #8B4513;
                    padding: 5mm;
                    height: 63mm;
                    width: 90mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                
                .label-header {
                    text-align: center;
                    border-bottom: 1px solid #8B4513;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                }
                
                .label-brand {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #8B4513;
                    text-transform: uppercase;
                }
                
                .label-name {
                    font-size: 12pt;
                    color: #333;
                    margin-bottom: 1mm;
                }
                
                .label-country {
                    font-weight: 600;
                    color: #555;
                    font-size: 8pt;
                    font-style: italic;
                }
                
                .label-main-content {
                    display: flex;
                    flex-grow: 1;
                    margin-bottom: 2mm;
                    padding-bottom: 8mm; /* Espace pour le prix */
                }
                
                .label-info {
                    flex: 1;
                    padding-right: 2mm;
                }
                
                .info-label {
                    font-weight: 600;
                    font-size: 7pt;
                    color: #8B4513;
                    display: inline-block;
                    width: 12mm;
                }
                
                .info-value {
                    font-size: 7pt;
                    color: #333;
                }
                
                .label-footer {
                    position: absolute;
                    bottom: 5mm;
                    right: 5mm;
                    text-align: right;
                }
                
                /* Solution révisée pour le prix */
                .label-price {
                    display: inline-block;
                    background-color: #8B4513 !important;
                    color: white !important;
                    padding: 1mm 3mm;
                    border-radius: 2px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                .label-qrcode {
                    width: 18mm;
                    height: 18mm;
                    border: 1px solid #8B4513;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    overflow: hidden;
                }
                
                .label-qrcode img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                .force-star.filled {
                    color: #8B4513;
                }
                
                .force-star.empty {
                    color: #ddd;
                }
            </style>
        </head>
        <body>
            <div id="contentContainer">${this.renderPlaceholderLabels()}</div>
            <script>
                // Fonction pour générer les QR codes après chargement de la page
                window.onload = function() {
                    const productElements = document.querySelectorAll('[data-product-id]');
                    
                    productElements.forEach(function(element) {
                        const productId = element.getAttribute('data-product-id');
                        const qrContainer = element.querySelector('.label-qrcode');
                        
                        // Créer le QR code
                        const canvas = document.createElement('canvas');
                        const qrCode = new QRious({
                            element: canvas,
                            value: productId,
                            size: 100,
                            backgroundAlpha: 0
                        });
                        
                        // Créer l'image et l'ajouter au conteneur
                        const img = document.createElement('img');
                        img.src = qrCode.toDataURL();
                        img.alt = "QR Code";
                        qrContainer.innerHTML = '';
                        qrContainer.appendChild(img);
                    });
                    
                    // Lancer l'impression après génération des QR codes
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }, 800);
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