import { TabBar, ContentShell } from './tab-bar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative bg-[var(--bg)]">
      <ContentShell>
        {children}
      </ContentShell>
      <TabBar />
    </div>
  )
}
