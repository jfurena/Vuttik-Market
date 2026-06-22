import re

# 1. Update CategoryExplorer.tsx
with open('src/components/CategoryExplorer.tsx', 'r', encoding='utf-8') as f:
    ce_code = f.read()

# Header section replacement
ce_header_old = """      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center gap-2 text-vuttik-blue font-black text-[8px] md:text-[10px] uppercase tracking-widest">
          <ShieldCheck size={12} className="md:size-[14px]" />
          Categorías por Consenso (Mega Guardianes)
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-black text-on-surface">¿Qué buscas hoy?</h2>
        <p className="text-on-surface-variant text-sm md:text-lg">Explora categorías validadas por la comunidad.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-100/80 rounded-[24px] md:rounded-[32px] px-14 md:px-16 py-4 md:py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] focus:shadow-[0_8px_30px_rgba(59,130,246,0.1)] focus:border-vuttik-blue/30 transition-all outline-none text-sm md:text-lg font-medium placeholder:text-gray-400"
        />
      </div>"""

ce_header_new = """      <section className="mb-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full">
              <ShieldCheck size={18} className="text-success" />
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Categorías Verificadas</span>
            </div>
            <h2 className="font-headline-lg md:text-display-lg-mobile font-bold text-vuttik-navy">Explorar Mercado</h2>
            <p className="text-on-surface-variant max-w-md font-body-md text-body-md">Descubre productos y servicios premium seleccionados en nuestro ecosistema verificado.</p>
          </div>
          <div className="relative w-full md:w-[400px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-outline" size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar categorías o artículos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border-none rounded-full shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] focus:ring-2 focus:ring-vuttik-blue text-body-md placeholder-outline-variant transition-all outline-none"
            />
          </div>
        </div>
      </section>"""

ce_code = ce_code.replace(ce_header_old, ce_header_new)

# Grid section replacement
ce_grid_old_regex = r'<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">.*?</div>\s*<!-- Binary Selection Modal'
ce_grid_new = """<section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {filteredCategories.map((cat, index) => {
          const Icon = getIcon(cat.icon);
          const color = getColor(cat.name);
          const isLarge = cat.id === 'GLOBAL';
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCategoryClick(cat)}
              className={`${isLarge ? 'col-span-1 md:col-span-2 md:row-span-2' : ''} bg-white rounded-lg p-8 shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_48px_0_rgba(6,11,25,0.08)] transition-all duration-300 group cursor-pointer flex flex-col justify-between items-start border border-outline-variant/10 relative overflow-hidden`}
              style={{ minHeight: isLarge ? '320px' : 'auto' }}
            >
              {isLarge ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-vuttik-navy/80 via-vuttik-navy/20 to-transparent p-8 flex flex-col justify-end z-10">
                    <Icon className="text-white mb-4" size={40} />
                    <h3 className="font-headline-lg text-white">{cat.name}</h3>
                    <p className="text-white/80 font-body-md text-body-md">{cat.description || 'Explora todo el ecosistema'}</p>
                  </div>
                  <div className={`absolute inset-0 ${color} opacity-90`} />
                </>
              ) : (
                <>
                  <div className={`w-14 h-14 rounded-full ${color.replace('bg-', 'bg-opacity-20 text-').replace('text-', 'text-')} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon size={28} className={color.replace('bg-', 'text-')} />
                  </div>
                  <div className="mt-8">
                    <h3 className="font-headline-md text-vuttik-navy">{cat.name}</h3>
                    <p className="text-on-surface-variant font-label-sm text-label-sm">{cat.description || 'Explorar'}</p>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </section>
      
      {/* Binary Selection Modal"""

ce_code = re.sub(ce_grid_old_regex, ce_grid_new, ce_code, flags=re.DOTALL)

with open('src/components/CategoryExplorer.tsx', 'w', encoding='utf-8') as f:
    f.write(ce_code)

# 2. Update SocialFeed.tsx
with open('src/components/SocialFeed.tsx', 'r', encoding='utf-8') as f:
    sf_code = f.read()

sf_top_old = """    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-display font-black text-on-surface">Social</h2>
        <p className="text-base md:text-lg text-on-surface-variant">Conéctate con la comunidad.</p>
      </div>"""

sf_top_new = """    <div className="feed-container space-y-6 pb-32 px-4 md:px-6 w-full">"""

sf_code = sf_code.replace(sf_top_old, sf_top_new)

sf_create_post_old_regex = r'<div className="bg-surface-container rounded-\[24px\] md:rounded-\[32px\] p-3 md:p-6 flex flex-col gap-3">.*?</div>\s*<!-- Posts -->'
sf_create_post_new = """<section className="bg-white rounded-lg p-6 shadow-[0_8px_32px_0_rgba(6,11,25,0.04)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-surface-variant/30">
                  <UserAvatar src={currentUser?.photoURL} alt={currentUser?.displayName || 'Usuario'} />
                </div>
                <div className="flex-grow">
                  <input
                    type="text"
                    placeholder="Comparte un hallazgo o inicia una conversación..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                    className="w-full border-none bg-surface-container-low rounded-full px-6 py-3 font-body-md focus:ring-2 focus:ring-vuttik-blue transition-all outline-none"
                  />
                </div>
                <input 
                  type="file" 
                  id="post-image-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageFile}
                />
                <label 
                  htmlFor="post-image-upload"
                  className="flex items-center justify-center p-3 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-full transition-all active:scale-90 cursor-pointer"
                >
                  <ImageIcon size={24} />
                </label>
                <button 
                  onClick={handlePublish}
                  disabled={!newPostContent.trim()}
                  className="bg-vuttik-blue text-white px-6 py-3 rounded-full font-label-md hover:opacity-90 transition-all active:scale-95 shadow-md disabled:opacity-50"
                >
                  Publicar
                </button>
              </div>
              {newPostImage && (
                <div className="relative mt-4 self-start ml-16">
                  <img src={newPostImage} alt="Preview" className="h-32 object-cover rounded-lg" />
                  <button 
                    onClick={() => setNewPostImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </section>
            
            {/* Posts */}"""
sf_code = re.sub(sf_create_post_old_regex, sf_create_post_new, sf_code, flags=re.DOTALL)

sf_post_item_old_regex = r'<motion.div[^>]*key={post.id}[^>]*initial={{ opacity: 0, y: 20 }}[^>]*animate={{ opacity: 1, y: 0 }}[^>]*transition={{ delay: index \* 0.05 }}[^>]*className="bg-white border border-gray-100 rounded-\[32px\] md:rounded-\[40px\] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"[^>]*>.*?</motion.div>'

sf_post_item_new = """<motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] overflow-hidden mb-6"
                    >
                      {/* Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => onNavigateToProfile(post.author_id)} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-surface-variant/30">
                              <UserAvatar src={post.author_avatar} alt={post.author_name} />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className="font-label-md text-on-surface">{post.author_name}</span>
                                {post.is_verified && <ShieldCheck size={18} className="text-vuttik-blue" />}
                              </div>
                              <span className="text-label-sm text-on-surface-variant">{formatDate(post.created_at)} • {post.location}</span>
                            </div>
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!isOwn && (
                            <button
                              onClick={() => handleFollow(post.author_id)}
                              disabled={isFollowLoading}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                isFollowing
                                  ? 'border border-vuttik-blue/30 text-vuttik-blue bg-vuttik-blue/5 hover:bg-red-50 hover:text-red-500'
                                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                              } ${isFollowLoading ? 'opacity-50' : ''}`}
                            >
                              {isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                          )}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                              className="p-2 text-outline hover:text-on-surface transition-colors rounded-full"
                            >
                              <MoreHorizontal size={20} />
                            </button>
                            {activeMenu === post.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-container-low py-2 z-50">
                                  {isOwn ? (
                                    <>
                                      <button onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); setActiveMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container transition-colors">Editar publicación</button>
                                      <button onClick={() => handleDeletePost(post.id)} className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error-container transition-colors">Eliminar publicación</button>
                                    </>
                                  ) : (
                                    <button onClick={() => { setActiveMenu(null); handleReportPost(post); }} className="w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container transition-colors">Reportar</button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Text */}
                      <div className="px-4 pb-4">
                        {editingPostId === post.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full bg-surface-container-low rounded-lg p-3 text-body-md text-on-surface outline-none resize-none focus:ring-2 focus:ring-vuttik-blue"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingPostId(null)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">Cancelar</button>
                              <button onClick={() => handleEditPost(post.id)} disabled={!editingContent.trim() || editingContent === post.content} className="px-4 py-2 text-sm bg-vuttik-blue text-white rounded-full">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-body-md text-on-surface">{post.content}</p>
                        )}
                      </div>

                      {/* Post Image */}
                      {post.image_url && (
                        <div className="relative w-full aspect-square md:aspect-video">
                          <button onClick={() => setSelectedImage(post.image_url!)} className="w-full h-full cursor-zoom-in">
                            <img src={post.image_url} alt="Post" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="p-4 flex items-center justify-between border-t border-surface-variant/30">
                        <div className="flex items-center gap-6">
                          <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 text-on-surface-variant hover:text-alert transition-all group">
                            <Heart size={20} className={`group-active:scale-125 transition-transform ${post.likes?.includes(currentUser?.uid || '') ? 'fill-alert text-alert' : ''}`} />
                            <span className="font-label-sm">{post.likes?.length || 0}</span>
                          </button>
                          <button onClick={() => handleOpenComments(post)} className="flex items-center gap-2 text-on-surface-variant hover:text-vuttik-blue transition-all">
                            <MessageCircle size={20} />
                            <span className="font-label-sm">{post.comments}</span>
                          </button>
                          <button onClick={() => handleRepost(post)} className="flex items-center gap-2 text-on-surface-variant hover:text-success transition-all">
                            <Repeat size={20} />
                          </button>
                        </div>
                        <button onClick={() => handleShare(post)} className="text-on-surface-variant hover:text-vuttik-blue transition-colors">
                          <Share2 size={20} />
                        </button>
                      </div>
                    </motion.div>"""
sf_code = re.sub(sf_post_item_old_regex, sf_post_item_new, sf_code, flags=re.DOTALL)

with open('src/components/SocialFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(sf_code)

# 3. Update ProductCard.tsx
with open('src/components/ProductCard.tsx', 'r', encoding='utf-8') as f:
    pc_code = f.read()

pc_old_regex = r'<motion\.div\s*initial={{ opacity: 0, y: 20 }}\s*whileInView={{ opacity: 1, y: 0 }}\s*viewport={{ once: true }}\s*onClick={\(\) => onViewDetails\?.\(id\)}\s*className={`bg-white border border-gray-100/60 rounded-\[24px\].*?</motion\.div>'
pc_new = """<motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onViewDetails?.(id)}
      className={`bg-white p-4 rounded-lg shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] group cursor-pointer relative overflow-hidden flex flex-col h-full`}
    >
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <span className={`${type === 'inform' ? 'bg-orange-500' : (typeColors[type as keyof typeof typeColors] || 'bg-vuttik-blue')} text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm w-fit`}>
          {type === 'inform' ? 'VENTA' : (typeLabel || typeLabels[type as keyof typeof typeLabels] || type)}
        </span>
        <span className="bg-white/90 backdrop-blur-sm text-vuttik-navy text-[12px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 w-fit">
          <ShieldAlert size={14} className="text-success" /> Trust Level: {trustLevel}
        </span>
      </div>

      {canEdit && (
        <div className="absolute top-6 right-6 z-20 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); props.onEdit?.(id); }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-on-surface shadow-sm hover:bg-vuttik-blue hover:text-white transition-all"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); props.onDelete?.(id); }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 relative">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-surface-container-low">
            <Info size={40} className="opacity-50" />
          </div>
        )}
        <div className="absolute bottom-4 right-4 bg-vuttik-navy text-white px-4 py-2 rounded-full font-bold shadow-lg text-sm">
          {price} <span className="text-[10px] font-normal">{currency}</span>
        </div>
      </div>
      
      <div className="flex flex-col flex-grow justify-between">
        <div>
            <h3 className="font-headline-md text-[20px] mb-1 line-clamp-2">{title}</h3>
            <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-2">
                <MapPin size={12} /> {location}
            </p>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-variant/30">
          <div 
            className="flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              if (props.onAuthorClick && props.authorId) {
                props.onAuthorClick(props.authorId);
              }
            }}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-surface-variant/30">
                <UserAvatar src={authorAvatar} alt={authorName} />
            </div>
            <span className="text-xs font-bold text-on-surface">{authorName || 'Usuario'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onVote?.(id, 'up'); }}
              className={`flex items-center gap-1 ${userVote === 'up' ? 'text-green-500' : 'text-on-surface-variant'}`}
            >
              <ArrowUp size={14} />
              <span className="text-xs font-bold">{upvotes}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>"""
pc_code = re.sub(pc_old_regex, pc_new, pc_code, flags=re.DOTALL)

with open('src/components/ProductCard.tsx', 'w', encoding='utf-8') as f:
    f.write(pc_code)

print("Update complete")
