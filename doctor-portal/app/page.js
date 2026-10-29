import HomeLoginFlow from '../components/auth/HomeLoginFlow';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-success/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Antigravity Medical</h1>
          <p className="text-primary mt-2 font-medium">Longitudinal Health Memory Layer</p>
        </div>
        
        <HomeLoginFlow />
      </div>
    </main>
  );
}
