/**
 * Gestionnaire de base de données IndexedDB pour l'application CigarManager
 * Gère la création, la connexion et les opérations sur la base de données
 */

class CigarManagerDB {
    constructor() {
        this.DB_NAME = 'CigarManagerDB';
        this.DB_VERSION = 1;
        this.db = null;
    }

    /**
     * Initialise la connexion à la base de données
     * @returns {Promise} - Promesse résolue lorsque la DB est prête
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error('Erreur d\'ouverture de la base de données:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Connexion à la base de données réussie');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Création des object stores avec des index
                if (!db.objectStoreNames.contains('products')) {
                    const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productsStore.createIndex('brand', 'brand', { unique: false });
                    productsStore.createIndex('name', 'name', { unique: false });
                    productsStore.createIndex('country', 'country', { unique: false });
                    productsStore.createIndex('supplier', 'supplier', { unique: false });
                }

                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('date', 'date', { unique: false });
                    salesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('Base de données créée/mise à jour avec succès');
            };
        });
    }

    /**
     * Ajoute un nouveau produit dans la base de données
     * @param {Object} product - Produit à ajouter
     * @returns {Promise} - Promesse avec l'ID du produit ajouté
     */
    async addProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            // Assurez-vous que certains champs sont toujours présents
            const newProduct = {
                ...product,
                stock: parseInt(product.stock || 0),
                price: parseFloat(product.price || 0),
                force: parseInt(product.force || 3)
            };
            
            const request = store.add(newProduct);
            
            request.onsuccess = (event) => {
                console.log('Produit ajouté avec succès, ID:', event.target.result);
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de l\'ajout du produit:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Met à jour un produit existant
     * @param {Object} product - Produit à mettre à jour (doit contenir un ID)
     * @returns {Promise} - Promesse résolue quand la mise à jour est terminée
     */
    async updateProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            // Convertir certains champs en nombres
            const updatedProduct = {
                ...product,
                stock: parseInt(product.stock || 0),
                price: parseFloat(product.price || 0),
                force: parseInt(product.force || 3)
            };
            
            const request = store.put(updatedProduct);
            
            request.onsuccess = () => {
                console.log('Produit mis à jour avec succès, ID:', product.id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la mise à jour du produit:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Supprime un produit
     * @param {number} id - ID du produit à supprimer
     * @returns {Promise} - Promesse résolue quand la suppression est terminée
     */
    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('Produit supprimé avec succès, ID:', id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la suppression du produit:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Met à jour le stock d'un produit
     * @param {number} id - ID du produit
     * @param {number} newStock - Nouvelle quantité en stock
     * @returns {Promise} - Promesse résolue quand la mise à jour est terminée
     */
    async updateProductStock(id, newStock) {
        return new Promise(async (resolve, reject) => {
            try {
                const product = await this.getProductById(id);
                if (!product) {
                    reject(new Error(`Produit avec l'ID ${id} non trouvé`));
                    return;
                }
                
                product.stock = parseInt(newStock);
                await this.updateProduct(product);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Récupère tous les produits
     * @returns {Promise<Array>} - Promesse contenant un tableau de produits
     */
    async getAllProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la récupération des produits:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère un produit par son ID
     * @param {number} id - ID du produit
     * @returns {Promise<Object>} - Promesse contenant le produit
     */
    async getProductById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.get(id);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la récupération du produit:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Vide tout le stock (met toutes les quantités à zéro)
     * @returns {Promise} - Promesse résolue quand l'opération est terminée
     */
    async resetAllStock() {
        return new Promise(async (resolve, reject) => {
            try {
                const products = await this.getAllProducts();
                const transaction = this.db.transaction(['products'], 'readwrite');
                const store = transaction.objectStore('products');
                
                // Utilisation d'un compteur pour suivre les mises à jour
                let completed = 0;
                
                products.forEach(product => {
                    product.stock = 0;
                    const request = store.put(product);
                    
                    request.onsuccess = () => {
                        completed++;
                        if (completed === products.length) {
                            resolve();
                        }
                    };
                    
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                
                // Si aucun produit, résoudre immédiatement
                if (products.length === 0) {
                    resolve();
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Supprime tous les produits
     * @returns {Promise} - Promesse résolue quand l'opération est terminée
     */
    async deleteAllProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('Tous les produits ont été supprimés');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la suppression de tous les produits:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Ajoute une nouvelle vente
     * @param {Object} sale - Objet vente avec les détails
     * @returns {Promise} - Promesse avec l'ID de la vente ajoutée
     */
    async addSale(sale) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sales'], 'readwrite');
            const store = transaction.objectStore('sales');
            
            // Ajout du timestamp pour faciliter le tri
            const newSale = {
                ...sale,
                timestamp: new Date().getTime()
            };
            
            const request = store.add(newSale);
            
            request.onsuccess = (event) => {
                console.log('Vente ajoutée avec succès, ID:', event.target.result);
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de l\'ajout de la vente:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Supprime une vente
     * @param {number} id - ID de la vente à supprimer
     * @returns {Promise} - Promesse résolue quand la suppression est terminée
     */
    async deleteSale(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sales'], 'readwrite');
            const store = transaction.objectStore('sales');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('Vente supprimée avec succès, ID:', id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la suppression de la vente:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère toutes les ventes
     * @returns {Promise<Array>} - Promesse contenant un tableau de ventes
     */
    async getAllSales() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sales'], 'readonly');
            const store = transaction.objectStore('sales');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la récupération des ventes:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère une vente par son ID
     * @param {number} id - ID de la vente
     * @returns {Promise<Object>} - Promesse contenant la vente
     */
    async getSaleById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sales'], 'readonly');
            const store = transaction.objectStore('sales');
            const request = store.get(id);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la récupération de la vente:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Récupère les ventes d'une période spécifique
     * @param {Date} startDate - Date de début
     * @param {Date} endDate - Date de fin
     * @returns {Promise<Array>} - Promesse contenant un tableau de ventes
     */
    async getSalesByDateRange(startDate, endDate) {
        return new Promise(async (resolve, reject) => {
            try {
                const allSales = await this.getAllSales();
                
                // Convertir les dates en timestamp pour faciliter la comparaison
                const startTimestamp = startDate.getTime();
                const endTimestamp = endDate.getTime();
                
                const filteredSales = allSales.filter(sale => {
                    return sale.timestamp >= startTimestamp && sale.timestamp <= endTimestamp;
                });
                
                resolve(filteredSales);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Supprime toutes les ventes
     * @returns {Promise} - Promesse résolue quand l'opération est terminée
     */
    async deleteAllSales() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sales'], 'readwrite');
            const store = transaction.objectStore('sales');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('Toutes les ventes ont été supprimées');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Erreur lors de la suppression de toutes les ventes:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Exporte toutes les données de la base de données
     * @returns {Promise<Object>} - Promesse contenant un objet avec toutes les données
     */
    async exportAllData() {
        return new Promise(async (resolve, reject) => {
            try {
                const products = await this.getAllProducts();
                const sales = await this.getAllSales();
                
                const exportData = {
                    products,
                    sales,
                    exportDate: new Date().toISOString()
                };
                
                resolve(exportData);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Importe des données dans la base de données
     * @param {Object} data - Données à importer (products, sales)
     * @returns {Promise} - Promesse résolue quand l'importation est terminée
     */
    async importAllData(data) {
        return new Promise(async (resolve, reject) => {
            try {
                // Vérification des données
                if (!data.products || !Array.isArray(data.products)) {
                    reject(new Error('Format de données invalide: products manquants ou format incorrect'));
                    return;
                }
                
                if (!data.sales || !Array.isArray(data.sales)) {
                    reject(new Error('Format de données invalide: sales manquants ou format incorrect'));
                    return;
                }
                
                // Supprimer toutes les données existantes
                await this.deleteAllProducts();
                await this.deleteAllSales();
                
                // Importer les produits
                const productTransaction = this.db.transaction(['products'], 'readwrite');
                const productStore = productTransaction.objectStore('products');
                
                data.products.forEach(product => {
                    productStore.add(product);
                });
                
                // Importer les ventes
                const saleTransaction = this.db.transaction(['sales'], 'readwrite');
                const saleStore = saleTransaction.objectStore('sales');
                
                data.sales.forEach(sale => {
                    saleStore.add(sale);
                });
                
                // Attendre que toutes les transactions soient terminées
                productTransaction.oncomplete = () => {
                    saleTransaction.oncomplete = () => {
                        console.log('Importation des données terminée avec succès');
                        resolve();
                    };
                    
                    saleTransaction.onerror = (event) => {
                        console.error('Erreur lors de l\'importation des ventes:', event.target.error);
                        reject(event.target.error);
                    };
                };
                
                productTransaction.onerror = (event) => {
                    console.error('Erreur lors de l\'importation des produits:', event.target.error);
                    reject(event.target.error);
                };
                
            } catch (error) {
                console.error('Erreur lors de l\'importation des données:', error);
                reject(error);
            }
        });
    }

    /**
     * Récupère la dernière vente effectuée
     * @returns {Promise<Object>} - Promesse contenant la dernière vente
     */
    async getLastSale() {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db.transaction(['sales'], 'readonly');
                const store = transaction.objectStore('sales');
                const index = store.index('timestamp');
                
                // Ouvrir un curseur qui parcourt de la fin au début (dernier au premier)
                const request = index.openCursor(null, 'prev');
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Retourner le premier résultat (la vente la plus récente)
                        resolve(cursor.value);
                    } else {
                        // Aucune vente trouvée
                        resolve(null);
                    }
                };
                
                request.onerror = (event) => {
                    console.error('Erreur lors de la récupération de la dernière vente:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }
}

// Exporter une instance du gestionnaire de base de données
const dbManager = new CigarManagerDB();