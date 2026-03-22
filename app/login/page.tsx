import { LoginForm } from "@/src/ui/forms/LoginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center">
      <div className="absolute inset-0">
        <Image
          src="/HombreTrabajando.png"
          alt="Ilustración de trabajo"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div
        className="absolute"
        style={{
          top: "4%",
          bottom: "4%",
          left: "55%",
          right: "3%",
        }}
      >
        <LoginForm />
      </div>
    </div>
  );
}