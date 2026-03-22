'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (T & { id: string })[];
        setData(results);
        setLoading(false);
      },
      async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'collection', 
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading };
}
