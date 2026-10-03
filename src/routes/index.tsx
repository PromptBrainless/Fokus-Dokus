import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/echo/game-app";

export const Route = createFileRoute("/")({ component: GameApp });
