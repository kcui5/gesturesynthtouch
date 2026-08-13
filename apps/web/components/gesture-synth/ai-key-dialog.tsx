"use client"

import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

type AiKeyDialogProps = {
  apiKey: string
  onApiKeyChange: (key: string) => void
  // Element rendered as the dialog trigger (props are merged onto it);
  // `label` becomes its children.
  trigger: React.ReactElement
  label: React.ReactNode
}

// Fallback for deployments without a server-side DECART_API_KEY: the user
// can paste their own key to switch on the AI morph. Kept in localStorage
// only — it never leaves this browser except to Decart itself.
export function AiKeyDialog({
  apiKey,
  onApiKeyChange,
  trigger,
  label,
}: AiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(apiKey)
      }}
    >
      <DialogTrigger render={trigger}>{label}</DialogTrigger>

      <DialogContent className="gap-5 border-2 border-(--synth-border) bg-(--synth-panel) text-white shadow-[6px_6px_0_rgba(0,0,0,0.6)] ring-0 sm:max-w-md **:data-[slot=dialog-close]:text-(--synth-text)">
        <DialogHeader>
          <DialogTitle className="font-pixel text-lg text-(--synth-text)">
            AI Effect Key
          </DialogTitle>
          <DialogDescription className="font-mono text-sm leading-relaxed text-white/85">
            To unlock anime morph, paste your Decart API key here.
            <br />
            The key is stored only in this browser.
          </DialogDescription>
        </DialogHeader>

        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Decart API key"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-2 border-(--synth-border) bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-(--synth-text)"
        />

        <DialogFooter>
          {apiKey && (
            <Button
              variant="ghost"
              className="font-mono text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => {
                onApiKeyChange("")
                setOpen(false)
              }}
            >
              Remove
            </Button>
          )}
          <Button
            className="border-2 border-(--synth-border) bg-(--synth-border) font-mono text-white hover:bg-(--synth-text) hover:text-black"
            onClick={() => {
              onApiKeyChange(draft)
              setOpen(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
