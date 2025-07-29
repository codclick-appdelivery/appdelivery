import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, logOut } = useAuth();

  return (
    <div>
      {currentUser && (
        <div className="fixed top-4 right-4 z-50">
          <Button onClick={logOut} variant="outline">
            Sair
          </Button>
        </div>
      )}
      {children}
    </div>
  );
};

export default AppLayout;
