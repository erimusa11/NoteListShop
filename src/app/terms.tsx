import { LegalDocumentScreen } from '@/components/LegalDocumentScreen';
import { TERMS_OF_USE } from '@/utils/legal';

export default function TermsScreen() {
  return <LegalDocumentScreen document={TERMS_OF_USE} />;
}
