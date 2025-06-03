"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  Globe,
  Gamepad2 
} from "lucide-react"
import CesiumMap from "./CesiumMap"
import { PhaserGame, IRefPhaserGame } from "../PhaserGame"

export function GameInterface() {
  const [cesiumMinimized, setCesiumMinimized] = useState(false)
  const [gameFullscreen, setGameFullscreen] = useState(false)
  const phaserRef = useRef<IRefPhaserGame | null>(null)

  const handleToggleCesium = () => {
    setCesiumMinimized(!cesiumMinimized)
  }

  const handleToggleGameFullscreen = () => {
    setGameFullscreen(!gameFullscreen)
  }

  const handleCurrentActiveScene = (scene: Phaser.Scene) => {
    console.log("Current active scene:", scene)
  }

  if (gameFullscreen) {
    return (
      <div className="h-screen w-full relative">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleGameFullscreen}
          className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Exit Fullscreen
        </Button>
        <div className="h-full w-full bg-black flex items-center justify-center">
          <PhaserGame 
            ref={phaserRef}
            currentActiveScene={handleCurrentActiveScene}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="vertical" className="h-full">
        {/* Cesium Globe Section */}
        <ResizablePanel 
          defaultSize={cesiumMinimized ? 15 : 50}
          minSize={cesiumMinimized ? 10 : 25}
          maxSize={75}
          collapsible={true}
        >
          <Card className="h-full rounded-none border-0 border-b">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Global Habitat Explorer</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleCesium}
                    className="h-8 w-8 p-0"
                  >
                    {cesiumMinimized ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {cesiumMinimized && (
                <p className="text-sm text-muted-foreground">
                  Click to expand the globe explorer
                </p>
              )}
            </CardHeader>
            {!cesiumMinimized && (
              <CardContent className="p-0 h-[calc(100%-5rem)]">
                <div className="h-full w-full">
                  <CesiumMap />
                </div>
              </CardContent>
            )}
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Phaser Game Section */}
        <ResizablePanel 
          defaultSize={cesiumMinimized ? 85 : 50} 
          minSize={25}
        >
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Species Discovery Game</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleGameFullscreen}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Match habitats to discover new species and unlock achievements
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="p-0 h-[calc(100%-6rem)]">
              <div className="h-full w-full bg-black flex items-center justify-center">
                <PhaserGame 
                  ref={phaserRef}
                  currentActiveScene={handleCurrentActiveScene}
                />
              </div>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}