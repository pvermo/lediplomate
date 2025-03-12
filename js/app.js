/**
 * Script principal de l'application CigarManager
 * Gère la navigation, l'initialisation et les fonctionnalités globales
 */

// Élements DOM
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebarItems = document.querySelectorAll('.sidebar-menu li');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('currentSection');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const exportFullDataBtn = document.getElementById('exportFullDataBtn');
const importFullDataBtn = document.getElementById('importFullDataBtn');

/**
 * Initialise l'application
 */
async function initApp() {
    try {
        console.log('Initialisation de l\'application CigarManager...');
        
        // Initialiser la base de données
        await dbManager.init();
        console.log('Base de données initialisée');
        
        // Initialiser les modules
        await productManager.loadProducts();
        await historyManager.loadSales();
        await statsManager.loadStats();
        await labelsManager.loadProducts();
        
        // Initialiser les événements globaux
        initEventListeners();
        
        // Mettre à jour le nombre total de produits
        updateProductCount();
        
        // Mettre le focus sur le champ de scanner externe après un court délai
        setTimeout(() => {
            const scannerInput = document.getElementById('externalScannerInput');
            if (scannerInput) {
                scannerInput.focus();
            }
        }, 1000);
        
        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        alert('Erreur lors de l\'initialisation de l\'application. Veuillez recharger la page.');
    }
}
/**
 * Met à jour le compteur de produits
 */
async function updateProductCount() {
    try {
        const products = await dbManager.getAllProducts();
        const productCount = document.getElementById('productCount');
        if (productCount) {
            productCount.textContent = products.length;
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du compteur de produits:', error);
    }
}

/**
 * Initialise les écouteurs d'événements globaux
 */
function initEventListeners() {
    // Sidebar mobile
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('show');
    });
    
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('show');
    });
    
    // Navigation dans les sections
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.getAttribute('data-target');
            switchSection(targetSection, item.textContent.trim());
            
            // Fermer la sidebar sur mobile
            sidebar.classList.remove('show');
        });
    });
    
    // Exportation/Importation des données
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', importData);
    exportFullDataBtn.addEventListener('click', exportFullData);
    importFullDataBtn.addEventListener('click', importFullData);
}
// Ajoutez cette fonction pour mettre à jour le compteur à chaque fois que la section des produits est affichée
/**
 * Change la section active
 * @param {string} sectionId - ID de la section à afficher
 * @param {string} title - Titre à afficher dans l'en-tête
 */
function switchSection(sectionId, title) {
    // Masquer TOUTES les sections, y compris tableau de bord et analyse des ratios
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Désactiver tous les éléments du menu
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activer la section et l'élément de menu correspondants
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const menuItem = document.querySelector(`[data-target="${sectionId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
    
    // Mettre à jour le titre
    if (currentSectionTitle) {
        currentSectionTitle.textContent = title;
    }
    
    // Si section des ventes, activer le focus sur le scanner
    if (sectionId === 'sales-section') {
        setTimeout(() => {
            const scannerInput = document.getElementById('externalScannerInput');
            if (scannerInput) {
                scannerInput.focus();
            }
        }, 100);
    }
    
    // Si on quitte la section des ventes, nettoyer le scanner
    if (document.getElementById('sales-section').classList.contains('active') && 
        sectionId !== 'sales-section') {
        if (salesManager.cleanupScanner) {
            salesManager.cleanupScanner();
        }
    }
    
    // Recharger les données si nécessaire
    if (sectionId === 'products-section') {
        productManager.loadProducts();
        updateProductCount();
    } else if (sectionId === 'history-section') {
        historyManager.loadSales();
    } else if (sectionId === 'stats-section') {
        // Ajouter un petit délai pour s'assurer que la section est visible
        setTimeout(() => {
            statsManager.loadStats();
        }, 100);
    } else if (sectionId === 'labels-section') {
        labelsManager.loadProducts();
    }
}

/**
 * Exporte toutes les données de l'application
 */
async function exportFullData() {
    try {
        // Afficher un indicateur de chargement
        const exportBtn = document.getElementById('exportFullDataBtn');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportation en cours...';
        exportBtn.disabled = true;
        
        // Récupérer toutes les données via le gestionnaire de DB
        const data = await dbManager.exportAllData();
        
        // Informations sur l'export pour l'utilisateur
        const productsCount = data.products ? data.products.length : 0;
        const salesCount = data.sales ? data.sales.length : 0;
        
        // Ajouter plus d'informations sur l'export
        data.exportInfo = {
            version: "1.0",
            date: new Date().toISOString(),
            productsCount: productsCount,
            salesCount: salesCount
        };
        
        // Convertir en JSON
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Télécharger le fichier
        const fileName = `cigar_manager_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
        saveAs(blob, fileName);
        
        // Restaurer le bouton
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        
        // Informer l'utilisateur du succès
        alert(`Exportation réussie !\n- ${productsCount} produits exportés\n- ${salesCount} ventes exportées`);
    } catch (error) {
        console.error('Erreur lors de l\'exportation des données:', error);
        alert('Erreur lors de l\'exportation des données.');
        
        // Restaurer le bouton en cas d'erreur
        const exportBtn = document.getElementById('exportFullDataBtn');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Exporter toutes les données';
            exportBtn.disabled = false;
        }
    }
}
/**
 * Exporte les données actuelles (produits uniquement)
 */
function exportData() {
    productManager.exportProductsToExcel();
}

/**
 * Importe des données dans l'application
 */
function importData() {
    // Ouvrir le modal d'importation Excel
    productManager.showImportModal();
}

/**
 * Importe toutes les données dans l'application
 */
async function importFullData() {
    // Créer un élément input file temporaire
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Afficher un indicateur de chargement
            const importBtn = document.getElementById('importFullDataBtn');
            const originalText = importBtn.innerHTML;
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importation en cours...';
            importBtn.disabled = true;
            
            // Lire le fichier JSON
            const jsonData = await readJsonFile(file);
            
            // Vérifier si le fichier contient les données nécessaires
            if (!jsonData.products || !Array.isArray(jsonData.products) ||
                !jsonData.sales || !Array.isArray(jsonData.sales)) {
                throw new Error('Format de fichier invalide. Le fichier doit contenir des produits et des ventes.');
            }
            
            // Détails pour la confirmation
            const productsCount = jsonData.products.length;
            const salesCount = jsonData.sales.length;
            
            if (confirm(`Attention: Cette action remplacera toutes les données existantes.\n\nLe fichier contient:\n- ${productsCount} produits\n- ${salesCount} ventes\n\nContinuer?`)) {
                // Importer les données
                await dbManager.importAllData(jsonData);
                
                // Recharger les données
                await productManager.loadProducts();
                await historyManager.loadSales();
                await statsManager.loadStats();
                await labelsManager.loadProducts();
                
                // Informer l'utilisateur du succès
                alert(`Importation réussie !\n- ${productsCount} produits importés\n- ${salesCount} ventes importées`);
            }
            
            // Restaurer le bouton
            importBtn.innerHTML = originalText;
            importBtn.disabled = false;
        } catch (error) {
            console.error('Erreur lors de l\'importation des données:', error);
            alert(`Erreur lors de l'importation: ${error.message}`);
            
            // Restaurer le bouton en cas d'erreur
            const importBtn = document.getElementById('importFullDataBtn');
            if (importBtn) {
                importBtn.innerHTML = '<i class="fas fa-upload"></i> Importer toutes les données';
                importBtn.disabled = false;
            }
        }
    });
    
    // Déclencher le clic sur l'input
    fileInput.click();
}

/**
 * Lit un fichier JSON
 * @param {File} file - Fichier JSON à lire
 * @returns {Promise<Object>} - Promesse contenant les données JSON
 */
function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (error) {
                reject(new Error('Format de fichier invalide. Le fichier doit être au format JSON.'));
            }
        };
        
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
        
        reader.readAsText(file);
    });
}
async function prepareDataForExport() {
    try {
        const products = await dbManager.getAllProducts();
        const sales = await dbManager.getAllSales();
        
        // Vérifier l'intégrité des données
        const validProducts = products.filter(product => 
            product.name && product.brand && typeof product.stock === 'number' && typeof product.price === 'number'
        );
        
        const validSales = sales.filter(sale => 
            sale.date && Array.isArray(sale.items) && typeof sale.total === 'number' && sale.total >= 0
        );
        
        // Retourner les données validées
        return {
            products: validProducts,
            sales: validSales,
            exportDate: new Date().toISOString()
        };
    } catch (error) {
        console.error('Erreur lors de la préparation des données pour l\'exportation:', error);
        throw new Error('Erreur lors de la préparation des données pour l\'exportation');
    }
}

// Mise à jour des événements pour les boutons d'importation/exportation
function updateImportExportEvents() {
    // Mettre à jour les boutons dans les paramètres
    const exportFullDataBtn = document.getElementById('exportFullDataBtn');
    const importFullDataBtn = document.getElementById('importFullDataBtn');
    
    if (exportFullDataBtn) {
        exportFullDataBtn.removeEventListener('click', exportFullData);
        exportFullDataBtn.addEventListener('click', exportFullData);
        // Mettre à jour le texte pour plus de clarté
        exportFullDataBtn.innerHTML = '<i class="fas fa-download"></i> Exporter produits et historique de ventes';
    }
    
    if (importFullDataBtn) {
        importFullDataBtn.removeEventListener('click', importFullData);
        importFullDataBtn.addEventListener('click', importFullData);
        // Mettre à jour le texte pour plus de clarté
        importFullDataBtn.innerHTML = '<i class="fas fa-upload"></i> Importer produits et historique de ventes';
    }
    
    // Mettre à jour les boutons dans la barre latérale
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    
    if (exportDataBtn) {
        exportDataBtn.innerHTML = '<i class="fas fa-download"></i> Exporter CSV/Excel';
        exportDataBtn.title = "Exporter les produits au format Excel";
    }
    
    if (importDataBtn) {
        importDataBtn.innerHTML = '<i class="fas fa-upload"></i> Importer CSV/Excel';
        importDataBtn.title = "Importer des produits depuis un fichier Excel";
    }
}


// Style CSS pour les étiquettes en aperçu
const labelStyles = document.createElement('style');
labelStyles.textContent = `
    .cigar-label {
        display: flex;
        flex-direction: column;
        padding: 8mm;
    }
    
    .label-header {
        display: flex;
        flex-direction: column;
    }
    
    .label-brand {
        font-weight: bold;
        font-size: 14pt;
    }
    
    .label-name {
        font-size: 12pt;
    }
    
    .label-details {
        flex-grow: 1;
        font-size: 9pt;
        line-height: 1.3;
        margin-top: 3mm;
    }
    
    .label-composition {
        margin-top: 2mm;
    }
    
    .label-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 2mm;
    }
    
    .label-price {
        font-weight: bold;
        font-size: 14pt;
    }
    
    .force-indicator {
        display: inline-flex;
        gap: 2mm;
        margin-left: 3mm;
    }
    
    .force-dot {
        display: inline-block;
        width: 3mm;
        height: 3mm;
        border-radius: 50%;
    }
    
    .force-dot.filled {
        background-color: black;
    }
    
    .force-dot.empty {
        border: 1px solid black;
    }
`;
document.head.appendChild(labelStyles);

// Initialiser l'application au chargement de la page
// Appeler cette fonction au chargement de l'application pour mettre à jour les libellés et événements
document.addEventListener('DOMContentLoaded', function() {
    // Cette fonction sera appelée après que l'application soit initialisée
    setTimeout(updateImportExportEvents, 1000);
});
document.addEventListener('DOMContentLoaded', initApp);