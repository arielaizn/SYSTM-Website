import { SiteShell } from '../components/layout/SiteShell';
import { PageHero } from '../components/sections/Shared';
import { Btn } from '../components/ui/Btn';

export default function NotFound() {
  return (
    <SiteShell>
    <main id="main">
      <PageHero
        n="404"
        label="העמוד לא נמצא"
        ghost="404"
        title={
          <>
            כאן אין תהליך.
            <br />
            <em>נחזור להתחלה?</em>
          </>
        }
        lead="הקישור שביקשתם לא קיים. אפשר לחזור לדף הבית או לראות את הפתרונות."
        actions={
          <>
            <Btn href="/">בחזרה לבית</Btn>
            <Btn href="/services/" variant="glass" delay={60}>
              לפתרונות
            </Btn>
          </>
        }
      />
    </main>
    </SiteShell>
  );
}
