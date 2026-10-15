import { LegalDocumentScreen } from '@/components/LegalDocumentScreen';
import { PRIVACY_POLICY } from '@/utils/legal';

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={PRIVACY_POLICY} />;
}
