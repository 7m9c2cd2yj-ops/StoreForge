"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { updateDisplayName } from "@/lib/actions/projects";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = React.useState(initialName);
  const [pending, startTransition] = React.useTransition();

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateDisplayName(name);
          if (result.ok) toast.success("Name updated");
          else toast.error(result.error);
        });
      }}
    >
      <Field label="Display name" htmlFor="display-name" className="flex-1">
        <Input id="display-name" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending && <Spinner />} Save
      </Button>
    </form>
  );
}
