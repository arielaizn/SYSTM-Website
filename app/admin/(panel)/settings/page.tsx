import { api } from '../../../../convex/_generated/api';
import { PageTop } from '../../../../components/admin/AdminShell';
import { SeedButton } from '../../../../components/admin/SeedButton';
import { SettingsForm } from '../../../../components/admin/SettingsForm';
import { adminQuery } from '../../../../lib/admin-api';
import { defaultSettings } from '../../../../lib/content-source';

export default async function SettingsPage() {
  const [doc, status] = await Promise.all([adminQuery(api.settings.get, {}), adminQuery(api.system.status, {})]);
  const s = doc ?? defaultSettings;
  return (
    <>
      <PageTop title="הגדרות ובאנר" subtitle="פרטי קשר, רשתות והודעה בראש האתר." />
      {!status.seeded ? (
        <div className="ad-hint" style={{ marginBottom: 16 }}>
          <span>ההגדרות נכנסות לתוקף רק אחרי שהתוכן יובא למערכת.</span>
          <SeedButton />
        </div>
      ) : null}
      <SettingsForm initial={{ phone: s.phone, phoneDisplay: s.phoneDisplay, whatsapp: s.whatsapp, email: s.email, description: s.description, socials: s.socials, banner: s.banner }} />
    </>
  );
}
