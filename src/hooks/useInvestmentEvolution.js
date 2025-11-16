import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export function useInvestmentEvolution(userId) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const evolutionRef = doc(db, 'investmentEvolutions', userId);

        const unsubscribe = onSnapshot(evolutionRef, (docSnapshot) => {
            setIsLoading(false);
            if (docSnapshot.exists()) {
                const docData = docSnapshot.data();
                
                // Si necesitas volver a depurar, descomenta esta línea:
                console.log("Datos brutos recibidos de Firestore:", docData); 
                
                setData(docData);
                setError(null);
            } else {
                setData(null);
                setError('Documento de inversión no encontrado.');
            }
        }, (err) => {
            setIsLoading(false);
            setError(err.message);
            console.error("Error al escuchar Firestore:", err);
        });

        return () => unsubscribe();
    }, [userId]);

    return { data, isLoading, error };
}