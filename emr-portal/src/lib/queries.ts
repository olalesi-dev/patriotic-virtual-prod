import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch all patients from the dedicated collection.
 */
export const getPatients = async () => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('lastName', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Fetch all providers from the users collection based on role.
 * Includes 'provider', 'clinician', 'admin', 'staff'.
 */
export const getProviders = async () => {
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        where('role', 'in', ['provider', 'clinician', 'admin', 'staff']),
        orderBy('displayName', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};
