import { RegisterForm } from "@/src/ui/forms/RegisterForm";
import Image from "next/image";

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center">
      {/* Ilustración full screen — reemplaza con tu imagen */}
      <div className="absolute inset-0">
        <Image
          src="/HombreTrabajando.png"
          alt="Ilustración de trabajo"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Card flotando a la derecha */}
      <div
        className="absolute"
        style={{
          top: "6%",
          bottom: "6%",
          left: "55%",
          right: "3%",
        }}
      >
        <RegisterForm />
      </div>
    </div>
  );
}