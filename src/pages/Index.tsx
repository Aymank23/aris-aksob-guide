import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-serif font-bold text-foreground">AKSOB ARIP System</h1>
        <p className="text-xl text-muted-foreground mb-6">Academic Risk Intervention Platform</p>
        <Button onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    </div>
  );
};

export default Index;
