import os
import re

src_dir = r'c:\Users\Dell Inspiron\Downloads\Vuttik-app\src'

def clean_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Remove import
    content = re.sub(r"import\s*\{[^}]*(?:motion|AnimatePresence)[^}]*\}\s*from\s*['\"](?:framer-motion|motion/react)['\"];?\r?\n?", '', content)

    # 2. Remove <AnimatePresence> and </AnimatePresence>
    content = re.sub(r'<AnimatePresence[^>]*>', '', content)
    content = re.sub(r'</AnimatePresence>', '', content)

    # 3. Replace <motion.div ...> with <div ...> and remove motion props
    def replace_motion_tag(m):
        tag_name = m.group(1)
        inner = m.group(2)
        
        # Remove motion specific props
        props_to_remove = [
            r'\s*initial=\{[^}]*\}',
            r'\s*animate=\{[^}]*\}',
            r'\s*exit=\{[^}]*\}',
            r'\s*transition=\{[^}]*\}',
            r'\s*whileHover=\{[^}]*\}',
            r'\s*whileTap=\{[^}]*\}',
            r'\s*whileFocus=\{[^}]*\}',
            r'\s*whileInView=\{[^}]*\}',
            r'\s*variants=\{[^}]*\}',
            r'\s*layoutId=\{[^}]*\}',
            r'\s*layout\b',
            r'\s*layout=\{[^}]*\}',
            r'\s*viewport=\{[^}]*\}',
            r'\s*drag\b',
            r'\s*dragConstraints=\{[^}]*\}',
            r'\s*dragElastic=\{[^}]*\}',
        ]
        
        # Need to be careful with nested braces in props like transition={{ duration: 0.2 }}
        # A simpler approach is to use non-greedy matches but it can fail on nested braces.
        # Let's try to remove them using a simpler regex first. If it fails, we'll manually fix.
        # Alternatively, we can just change the tag to standard HTML tag and ignore props for now? No, invalid props cause React errors.
        
        # We will use a regex that handles up to 2 levels of nesting
        for p in props_to_remove:
            # Replace property that has simple string value or boolean
            inner = re.sub(p, '', inner)
            # Replace property with up to 1 level of nested braces {{ ... }}
            p_nested1 = p.replace(r'\{[^}]*\}', r'\{\{[^}]*\}\}')
            inner = re.sub(p_nested1, '', inner)
            # Replace property with up to 2 level of nested braces {{{ ... }}}
            p_nested2 = p.replace(r'\{[^}]*\}', r'\{\{\{[^}]*\}\}\}')
            inner = re.sub(p_nested2, '', inner)
            
        return f'<{tag_name}{inner}>'

    # Matches <motion.div ... > but avoids matching the closing > of a different tag.
    # Actually, re.sub with a function is better.
    # We will just replace motion.div with div, etc.
    content = re.sub(r'<motion\.([a-zA-Z0-9_]+)', r'<\1', content)
    content = re.sub(r'</motion\.([a-zA-Z0-9_]+)>', r'</\1>', content)
    
    # Now we have standard tags but with framer-motion props like initial={...}
    # This might cause React warnings, but it shouldn't crash the app in production, 
    # except that React 19 might be strict about unknown props.
    # Let's try to strip them out.
    
    props_to_remove = [
        'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap',
        'whileFocus', 'whileInView', 'variants', 'layoutId', 'layout', 'viewport',
        'drag', 'dragConstraints', 'dragElastic'
    ]
    
    # A simple regex to remove prop={...} or prop="{{...}}" where prop is in our list
    for prop in props_to_remove:
        # Matches prop={...} (basic)
        content = re.sub(rf'\s+{prop}=\{{[^}}]*\}}', '', content)
        # Matches prop={{...}} 
        content = re.sub(rf'\s+{prop}=\{{\{{[^}}]*\}}\}}', '', content)
        # Matches boolean prop like layout or drag
        content = re.sub(rf'\s+{prop}(?=\s|>)', '', content)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {fpath}")

for root, dirs, files in os.walk(src_dir):
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            clean_file(os.path.join(root, fname))

