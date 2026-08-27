import React, { useState } from 'react';
import { CrossmintProvider, CrossmintHostedCheckout } from '@crossmint/client-sdk-react-ui';
import { AlertCircle, CreditCard, Info } from 'lucide-react';

interface CrossmintCheckoutProps {
  planId: string;
  planName: string;
  price: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CrossmintCheckout({ planId, planName, price, onSuccess, onCancel }: CrossmintCheckoutProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // IMPORTANTE: Para usar Crossmint SDK v4, necesitas un Client API Key (empieza con ck_)
  // Ve al dashboard de Crossmint (Staging) -> API Keys -> Create New Key -> Selecciona Client-side
  const CROSSMINT_API_KEY = "ck_PON_TU_API_KEY_AQUI"; 

  // Simulamos que el pago fue exitoso para que Vuttik pueda seguir
  // En producción, Crossmint llamará al webhook o puedes usar el onPaymentCompleted del componente
  const handlePaymentSuccess = () => {
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 text-center bg-gray-50 border-b border-gray-100 relative">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-vuttik-blue" />
          </div>
          <h2 className="text-2xl font-black text-vuttik-navy">Pago Seguro con Crossmint</h2>
          <p className="text-gray-500 mt-1">Plan: {planName} - ${price} USDC</p>
        </div>

        {/* Content */}
        <div className="p-8">
          
          {CROSSMINT_API_KEY === "ck_PON_TU_API_KEY_AQUI" ? (
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl flex items-start gap-4">
                <Info className="shrink-0 mt-0.5" size={24} />
                <div className="text-sm font-medium leading-relaxed">
                  <h3 className="text-lg font-bold mb-2">Falta configurar el API Key</h3>
                  <p className="mb-2">
                    Para que la pasarela de Crossmint funcione correctamente, necesitas generar un <strong>Client API Key</strong> en tu consola de Crossmint.
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 mb-4">
                    <li>Ve a <a href="https://staging.crossmint.com/console/keys" target="_blank" rel="noreferrer" className="underline font-bold">staging.crossmint.com</a></li>
                    <li>Crea una nueva llave y selecciona <strong>"Client-side"</strong></li>
                    <li>Copia la llave (empezará con <code>ck_...</code>) y reemplázala en el código (<code>CROSSMINT_API_KEY</code>).</li>
                  </ol>
                  <button 
                    onClick={onSuccess}
                    className="bg-vuttik-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors w-full"
                  >
                    Simular Pago Exitoso (Solo para Pruebas)
                  </button>
                </div>
             </div>
          ) : (
            <div className="w-full flex justify-center">
              <CrossmintProvider apiKey={CROSSMINT_API_KEY}>
                <CrossmintHostedCheckout
                  lineItems={{
                    collectionLocator: "crossmint:ec0b2fd7-300d-4e41-a080-237d4f985378",
                    callData: {
                      totalPrice: price,
                      qty: 1
                    }
                  }}
                  environment="staging"
                  paymentMethod="fiat"
                  onEvent={(event) => {
                    console.log("Crossmint Event:", event);
                    if (event.type === "payment:completed") {
                       handlePaymentSuccess();
                    } else if (event.type === "payment:failed") {
                       setErrorMsg("El pago falló. " + (event.payload?.error?.message || ""));
                    }
                  }}
                />
              </CrossmintProvider>
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <div className="text-sm font-medium leading-relaxed">
                {errorMsg}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
