import { router, useLocalSearchParams } from 'expo-router';

import { CardForm } from '@/components/CardForm';
import { createCard } from '@/db/cards';

export default function NewCardScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  return (
    <CardForm
      submitLabel="Ekle"
      onSubmit={(input) => {
        createCard(deckId, input);
        router.back();
      }}
    />
  );
}
