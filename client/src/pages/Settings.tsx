import { DependenciesSection } from '@/components/settings/DependenciesSection';
import { RomsSection } from '@/components/settings/RomsSection';
import { BiosSection } from '@/components/settings/BiosSection';
import { SavesSection } from '@/components/settings/SavesSection';
import { CollectionSection } from '@/components/settings/CollectionSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { ConnectPhoneSection } from '@/components/settings/ConnectPhoneSection';
import { PortableBadge } from '@/components/settings/PortableBadge';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <PortableBadge />
      </div>

      <ConnectPhoneSection />
      <DependenciesSection />
      <RomsSection />
      <BiosSection />
      <SavesSection />
      <CollectionSection />
      <NotificationsSection />
    </div>
  );
}
