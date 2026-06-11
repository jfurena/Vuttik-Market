const fs = require('fs');
let c = fs.readFileSync('src/components/BusinessDashboard.tsx', 'utf8');

c = c.replace(/    const unsubscribeInv = onSnapshot\(qInv, \(snapshot\) => \{\n      setInventory\(snapshot.docs.map\(doc => \(\{ id: doc.id, ...doc.data\(\) \}\)\)\);\n    \}, \(error\) => \{\n      handleFirestoreError\(error, OperationType.LIST, 'products'\);\n    \}\);\n\n    return \(\) => \{\n      unsubscribePromo\(\);\n      unsubscribeInv\(\);\n    \};\n  \}, \[\]\);/g, '');

c = c.replace(/    try \{\n      if \(!auth\.currentUser\) return;\n      const data = \{\n        name: formData.name,\n        price: parseFloat\(formData.price\),\n        stock: parseInt\(formData.stock\),\n        status: formData.status,\n        businessId: auth.currentUser.uid,\n        updatedAt: serverTimestamp\(\)\n      \};\n\n      if \(editingItem\) \{\n        await updateDoc\(doc\(db, 'products', editingItem.id\), data\);\n      \} else \{\n        await addDoc\(collection\(db, 'products'\), \{\n          \.\.\.data,\n          createdAt: serverTimestamp\(\)\n        \}\);\n      \}\n      setShowEditModal\(false\);\n    \} catch \(error\) \{\n      handleFirestoreError\(error, editingItem \? OperationType.UPDATE : OperationType.CREATE, 'products'\);\n    \} finally \{/g, `    try {\n      const data = {\n        title: formData.name,\n        description: formData.description || '',\n        price: parseFloat(formData.price),\n        stock: parseInt(formData.stock),\n        status: formData.status,\n        authorId: user.uid,\n        authorName: user.displayName || 'Vuttik Business',\n        categoryId: formData.categoryId || 'GLOBAL',\n        typeId: 'sell',\n        location: '',\n        currency: 'DOP'\n      };\n\n      if (editingItem) {\n        await api.updateProduct(editingItem.id, data, user.uid);\n      } else {\n        await api.publishProduct(data);\n      }\n      await loadData();\n      setShowEditModal(false);\n    } catch (error) {\n      console.error('Error saving product:', error);\n      alert('Error al guardar el producto. Intenta de nuevo.');\n    } finally {`);

c = c.replace(/    try \{\n      await deleteDoc\(doc\(db, 'products', id\)\);\n    \} catch \(error\) \{\n      handleFirestoreError\(error, OperationType.DELETE, 'products'\);\n    \}/g, `    try {\n      if (!user) return;\n      await api.deleteProduct(id, user.uid);\n      await loadData();\n    } catch (error) {\n      console.error('Error deleting product:', error);\n    }`);

c = c.replace(/<p className="text-\[10px\] text-vuttik-text-muted font-bold">\n\s*\{promo\.createdAt \? new Date\(promo\.createdAt\.toDate\(\)\)\.toLocaleDateString\(\) : 'Sin fecha'\}\n\s*<\/p>/g, `<div className="flex items-center gap-3">
                    <p className="text-[10px] text-vuttik-text-muted font-bold">
                      {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString() : 'Sin fecha'}
                    </p>
                    <button 
                      onClick={() => handleDeletePromo(promo.id)}
                      title="Eliminar Promoción"
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>`);

fs.writeFileSync('src/components/BusinessDashboard.tsx', c);
console.log('Fixed');
