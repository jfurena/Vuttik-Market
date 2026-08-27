import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, Sparkles } from 'lucide-react';

/**
 * Marco para visitantes sin cuenta.
 *
 * Antes toda la aplicación estaba detrás de `if (!user) return <Auth />`, así que
 * nadie podía ver un producto sin registrarse antes. Eso pide el compromiso
 * antes de demostrar el valor, y además impide que los buscadores indexen el
 * catálogo: para un marketplace local, la búsqueda orgánica es el canal
 * principal de descubrimiento.
 *
 * Aquí el visitante navega libremente; la invitación a registrarse aparece en el
 * momento de actuar (contactar, publicar, guardar), cuando ya entiende para qué.
 */

interface PublicShellProps {
  children: React.ReactNode;
  /** Búsqueda actual, para mantenerla visible al navegar. */
  query?: string;
  onSearch?: (q: string) => void;
}

export default function PublicShell({ children, query = '', onSearch }: PublicShellProps) {
  const navigate = useNavigate();
  const [texto, setTexto] = React.useState(query);

  React.useEffect(() => { setTexto(query); }, [query]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = texto.trim();
    if (onSearch) return onSearch(q);
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 text-xl font-black tracking-tight text-vuttik-blue"
          >
            Vuttik
          </button>

          <form onSubmit={buscar} className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar productos, negocios…"
                aria-label="Buscar"
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-vuttik-blue focus:bg-white"
              />
            </div>
          </form>

          <button
            onClick={() => navigate('/entrar')}
            className="flex flex-shrink-0 items-center gap-2 rounded-full bg-vuttik-blue px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105 sm:px-5"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Iniciar sesión</span>
          </button>
        </div>
      </header>

      <main className="pt-[68px]">{children}</main>

      <footer className="mt-16 border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center">
          <p className="mb-1 text-lg font-black text-vuttik-blue">Vuttik</p>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
            El mercado de tu barrio. Compara precios, descubre ofertas cerca de ti
            y conecta directo con los negocios.
          </p>
          <button
            onClick={() => navigate('/entrar')}
            className="rounded-full bg-vuttik-blue px-6 py-3 text-sm font-bold text-white"
          >
            Crear cuenta gratis
          </button>
        </div>
      </footer>
    </div>
  );
}

/**
 * Invitación a registrarse que sustituye a una acción que requiere cuenta.
 * Explica qué se desbloquea en lugar de limitarse a bloquear.
 */
export function LoginPrompt({ accion }: { accion: string }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl border border-vuttik-blue/20 bg-vuttik-blue/5 p-6 text-center">
      <Sparkles className="mx-auto mb-3 h-6 w-6 text-vuttik-blue" />
      <p className="mb-1 font-bold text-gray-900">Crea tu cuenta para {accion}</p>
      <p className="mx-auto mb-4 max-w-sm text-sm text-gray-500">
        Es gratis y toma menos de un minuto. Podrás contactar negocios, guardar
        productos y publicar los tuyos.
      </p>
      <button
        onClick={() => navigate('/entrar')}
        className="rounded-full bg-vuttik-blue px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
      >
        Crear cuenta gratis
      </button>
    </div>
  );
}
