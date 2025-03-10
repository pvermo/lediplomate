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
    // Masquer toutes les sections
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Désactiver tous les éléments du menu
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Activer la section et l'élément de menu correspondants
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`[data-target="${sectionId}"]`).classList.add('active');
    
    // Mettre à jour le titre
    currentSectionTitle.textContent = title;
    
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
        const data = await dbManager.exportAllData();
        
        // Convertir en JSON
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Télécharger le fichier
        const fileName = `cigar_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
        saveAs(blob, fileName);
        
        alert('Exportation réussie');
    } catch (error) {
        console.error('Erreur lors de l\'exportation des données:', error);
        alert('Erreur lors de l\'exportation des données.');
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
            const jsonData = await readJsonFile(file);
            
            if (confirm('Attention: Cette action remplacera toutes les données existantes. Continuer?')) {
                await dbManager.importAllData(jsonData);
                
                // Recharger les données
                await productManager.loadProducts();
                await historyManager.loadSales();
                await statsManager.loadStats();
                await labelsManager.loadProducts();
                
                alert('Importation réussie');
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation des données:', error);
            alert(`Erreur lors de l'importation: ${error.message}`);
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
                reject(new Error('Format de fichier invalide'));
            }
        };
        
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
        
        reader.readAsText(file);
    });
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
document.addEventListener('DOMContentLoaded', initApp);