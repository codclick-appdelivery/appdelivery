
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDMeBrASTP0QiDbC2frw-E-WY1XEoGqKRY",
  authDomain: "delivery-facil-51030.firebaseapp.com",
  projectId: "delivery-facil-51030",
  storageBucket: "delivery-facil-51030.firebasestorage.app",
  messagingSenderId: "580404329384",
  appId: "1:580404329384:web:b22fbaa09b7cc42cdd3b9d",
  measurementId: "G-0EW4YWQQCY"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar o serviço de autenticação
export const auth = getAuth(app);

// Inicializar o Firestore
export const db = getFirestore(app);

// Inicializar Analytics somente no navegador para evitar erros em SSR
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
