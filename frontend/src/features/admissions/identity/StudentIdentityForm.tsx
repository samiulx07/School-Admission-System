"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { BsArrowRight, BsCheck2 } from "react-icons/bs";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { studentIdentitySchema, type StudentIdentityFields } from "./studentIdentity";
import styles from "./StudentIdentityForm.module.scss";

export function StudentIdentityForm() {
  const { studentId, isReady, isChanging, storageStatus, changeStudentId, clearStudentId } = useStudentIdentity();
  const id = useId();
  const [feedback, setFeedback] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StudentIdentityFields>({
    resolver: zodResolver(studentIdentitySchema),
    defaultValues: { studentId: "" },
    values: { studentId: studentId ?? "" },
  });
  const busy = !isReady || isChanging || isSubmitting;

  const submit = handleSubmit(async (values) => {
    setFeedback("");
    try {
      await changeStudentId(values.studentId);
      setFeedback("Registration number updated.");
    } catch {
      setFeedback("We could not update your registration number. Please try again.");
    }
  });

  const clear = async () => {
    setFeedback("");
    await clearStudentId();
    setFeedback("Registration number cleared from this tab.");
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-heading`} aria-busy={busy}>
      <div className={styles.heading}>
        <span className={styles.state}><BsCheck2 aria-hidden="true" /> {studentId ? "Registration number ready" : "Your student details"}</span>
        <h2 id={`${id}-heading`}>Your applications, together.</h2>
        <p>Use the same 17-digit number whenever you return to your applications.</p>
      </div>
      <div className={styles.registration} aria-busy={!isReady}>
        <span>Current registration number</span>
        <strong>{!isReady ? "Checking..." : studentId ?? "Not set"}</strong>
      </div>
      <Form noValidate onSubmit={submit} className={styles.form}>
        <Form.Group controlId={`${id}-student-id`}>
          <Form.Label className={styles.label}>Student registration number</Form.Label>
          <Form.Control
            {...register("studentId", { onChange: () => setFeedback("") })}
            className={styles.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter your 17-digit number"
            aria-invalid={Boolean(errors.studentId)}
            aria-describedby={`${id}-help${errors.studentId ? ` ${id}-error` : ""}`}
            isInvalid={Boolean(errors.studentId)}
            disabled={busy}
          />
          <p id={`${id}-help`} className={styles.help}>Digits 0-9 only. Keep any zeros at the beginning.</p>
          {errors.studentId ? <p id={`${id}-error`} className={styles.error} role="alert">{errors.studentId.message}</p> : null}
        </Form.Group>
        <div className={styles.actions}>
          <Button type="submit" disabled={busy}>{isChanging ? "Updating..." : studentId ? "Update number" : "Use this number"}<BsArrowRight aria-hidden="true" /></Button>
          <Button type="button" variant="outline-secondary" className={styles.clear} onClick={clear} disabled={busy || !studentId}>Clear number</Button>
        </div>
      </Form>
      <div className={styles.messages} aria-live="polite" aria-atomic="true">
        {storageStatus === "unavailable" ? <p className={styles.notice}>Browser storage is unavailable. Changes apply in this tab and may not be remembered after reload.</p> : null}
        {storageStatus === "invalid" ? <p className={styles.notice}>The saved registration number could not be read. Please enter it again.</p> : null}
        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      </div>
      <p className={styles.privacy}>This number identifies applications. It does not sign you in. Clear it when you finish on a shared device.</p>
    </section>
  );
}
