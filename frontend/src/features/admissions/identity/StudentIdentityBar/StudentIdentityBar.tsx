"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { studentIdentitySchema, type StudentIdentityFields } from "../studentIdentity";
import styles from "./StudentIdentityBar.module.scss";

export function StudentIdentityBar() {
  const { studentId, isReady, isChanging, storageStatus, changeStudentId } = useStudentIdentity();
  const id = useId();
  const [feedback, setFeedback] = useState<{ studentId: string | null; message: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StudentIdentityFields>({
    resolver: zodResolver(studentIdentitySchema),
    defaultValues: { studentId: "" },
    values: { studentId: studentId ?? "" },
  });
  const busy = !isReady || isChanging || isSubmitting;

  const submit = handleSubmit(async (values) => {
    setFeedback(null);
    try {
      await changeStudentId(values.studentId);
      setFeedback({ studentId: values.studentId, message: "Student ID applied." });
    } catch {
      setFeedback({ studentId, message: "Your Student ID could not be updated. Please try again." });
    }
  });

  return (
    <section className={styles.bar} aria-label="Student identity" aria-busy={busy}>
      <Form noValidate onSubmit={submit} className={styles.inner}>
        <Form.Label htmlFor={`${id}-student-id`} className={styles.label}>Student ID</Form.Label>
        <div className={styles.controls}>
          <Form.Control
            {...register("studentId", { onChange: () => setFeedback(null) })}
            id={`${id}-student-id`}
            className={styles.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Your 17-digit number"
            aria-invalid={Boolean(errors.studentId)}
            aria-describedby={`${id}-help${errors.studentId ? ` ${id}-error` : ""}`}
            isInvalid={Boolean(errors.studentId)}
            disabled={busy}
          />
          <Button type="submit" className={styles.button} disabled={busy}>
            {isChanging || isSubmitting ? "Updating..." : studentId ? "Update ID" : "Use ID"}
          </Button>
        </div>
        <p id={`${id}-help`} className={styles.help}>Your 17-digit birth registration number. Keep leading zeros.</p>
        <div className={styles.messages} aria-live="polite" aria-atomic="true">
          {errors.studentId ? <p id={`${id}-error`} className={styles.error} role="alert">{errors.studentId.message}</p> : null}
          {storageStatus === "unavailable" ? <p className={styles.notice}>ID stays in this tab because browser storage is unavailable. It may be lost after reload.</p> : null}
          {storageStatus === "invalid" ? <p className={styles.notice}>The saved ID was invalid. Enter your 17-digit Student ID again.</p> : null}
          {feedback && feedback.studentId === studentId ? <p className={styles.feedback}>{feedback.message}</p> : null}
        </div>
      </Form>
    </section>
  );
}
