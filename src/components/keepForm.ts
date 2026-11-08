import { startTransition } from "react";

// React resets a <form action={...}> after every submit, which wipes what the
// person typed when the server answers with an error. Submitting through
// onSubmit keeps their input in place.
export function keepOnSubmit(run: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
}
