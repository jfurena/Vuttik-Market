import os
import re

src_dir = r'c:\Users\Dell Inspiron\Downloads\Vuttik-app\src'

for root, dirs, files in os.walk(src_dir):
    for fname in files:
        if not (fname.endswith('.tsx') or fname.endswith('.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Remove the import line entirely
        content = re.sub(
            r"import\s*\{[^}]*(?:motion|AnimatePresence)[^}]*\}\s*from\s*['\"]framer-motion['\"];\r?\n",
            '',
            content
        )

        # Replace <AnimatePresence ...> ... </AnimatePresence> tags (opening and closing)
        content = re.sub(r'<AnimatePresence[^>]*>', '', content)
        content = re.sub(r'</AnimatePresence>', '', content)

        # Replace <motion.div ...> with <div ...> (preserve all attributes except motion-specific ones)
        # First pass: opening tags - remove motion-specific props and rename tag
        def replace_motion_open(m):
            inner = m.group(1)
            # Remove framer-motion specific props
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileHover=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileTap=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileFocus=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileInView=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*variants=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*layout\b', '', inner)
            inner = re.sub(r'\s*layoutId=\{[^}]*\}', '', inner)
            return f'<div{inner}>'

        content = re.sub(r'<motion\.div([^>]*)>', replace_motion_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.div>', '</div>', content)

        def replace_motion_span_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileHover=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileTap=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*variants=\{[^}]*\}', '', inner)
            return f'<span{inner}>'

        content = re.sub(r'<motion\.span([^>]*)>', replace_motion_span_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.span>', '</span>', content)

        def replace_motion_button_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileHover=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileTap=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*variants=\{[^}]*\}', '', inner)
            return f'<button{inner}>'

        content = re.sub(r'<motion\.button([^>]*)>', replace_motion_button_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.button>', '</button>', content)

        def replace_motion_li_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileHover=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileTap=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*variants=\{[^}]*\}', '', inner)
            return f'<li{inner}>'

        content = re.sub(r'<motion\.li([^>]*)>', replace_motion_li_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.li>', '</li>', content)

        def replace_motion_p_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileHover=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*whileTap=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*variants=\{[^}]*\}', '', inner)
            return f'<p{inner}>'

        content = re.sub(r'<motion\.p([^>]*)>', replace_motion_p_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.p>', '</p>', content)

        def replace_motion_section_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            return f'<section{inner}>'

        content = re.sub(r'<motion\.section([^>]*)>', replace_motion_section_open, content, flags=re.DOTALL)
        content = re.sub(r'</motion\.section>', '</section>', content)

        def replace_motion_article_open(m):
            inner = m.group(1)
            inner = re.sub(r'\s*initial=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*animate=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*exit=\{[^}]*\}', '', inner)
            inner = re.sub(r'\s*transition=\{[^}]*\}', '', inner)
            return f'<article{inner}
