import re

with open(r'c:\Users\Dell Inspiron\Downloads\Vuttik-app\src\components\TopNav.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useNavigate import
content = content.replace("import { useAuth } from '../contexts/AuthContext';", "import { useAuth } from '../contexts/AuthContext';\nimport { useNavigate } from 'react-router-dom';")

# Remove onNavigate from props
content = content.replace("onNavigate?: (tab: string) => void;", "")
content = content.replace("onNavigate }: TopNavProps)", "}: TopNavProps)")

# Update menuItems
old_menu = """  const menuItems = [
    { id: 'profile', label: 'Mi Perfil', icon: User, role: ['user', 'business', 'negocio', 'guardian', 'mega_guardian', 'admin'], feature: 'profile' },
    { id: 'negocio', label: 'Modo Negocio', icon: Store, role: ['negocio', 'mega_guardian', 'admin'], feature: 'negocio_dash' },
    { id: 'business', label: 'Modo Empresa', icon: Briefcase, role: ['business', 'mega_guardian', 'admin'], feature: 'business_dash' },
    { id: 'guardian', label: 'Modo Guardian', icon: Shield, role: ['guardian', 'mega_guardian', 'admin'], feature: 'guardian_dash' },
    { id: 'mega-guardian', label: 'Modo Mega Guardian', icon: ShieldAlert, role: ['mega_guardian', 'admin'], feature: 'mega_guardian_dash' },
    { id: 'admin', label: 'Panel Dueño', icon: ShieldAlert, role: ['admin'], feature: 'admin_dash' },
    { id: 'settings', label: 'Ajustes', icon: Settings, role: ['user', 'business', 'guardian', 'mega_guardian', 'admin'], feature: 'settings' },
  ];"""

new_menu = """  const navigate = useNavigate();

  const menuItems = [
    { id: 'profile', path: '/perfil', label: 'Mi Perfil', icon: User, role: ['user', 'business', 'negocio', 'guardian', 'mega_guardian', 'admin'], feature: 'profile' },
    { id: 'negocio', path: '/panel/negocio', label: 'Modo Negocio', icon: Store, role: ['negocio', 'mega_guardian', 'admin'], feature: 'negocio_dash' },
    { id: 'business', path: '/panel/empresa', label: 'Modo Empresa', icon: Briefcase, role: ['business', 'mega_guardian', 'admin'], feature: 'business_dash' },
    { id: 'guardian', path: '/panel/guardian', label: 'Modo Guardian', icon: Shield, role: ['guardian', 'mega_guardian', 'admin'], feature: 'guardian_dash' },
    { id: 'mega-guardian', path: '/panel/mega-guardian', label: 'Modo Mega Guardian', icon: ShieldAlert, role: ['mega_guardian', 'admin'], feature: 'mega_guardian_dash' },
    { id: 'admin', path: '/panel/mega-guardian', label: 'Panel Dueño', icon: ShieldAlert, role: ['admin'], feature: 'admin_dash' },
    { id: 'settings', path: '/perfil', label: 'Ajustes', icon: Settings, role: ['user', 'business', 'guardian', 'mega_guardian', 'admin'], feature: 'settings' },
  ];"""

content = content.replace(old_menu, new_menu)

# Update onClick
old_click = """                        onClick={() => {
                          onNavigate?.(item.id);
                          setShowMenu(false);
                        }}"""
new_click = """                        onClick={() => {
                          navigate(item.path);
                          setShowMenu(false);
                        }}"""

content = content.replace(old_click, new_click)

with open(r'c:\Users\Dell Inspiron\Downloads\Vuttik-app\src\components\TopNav.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
