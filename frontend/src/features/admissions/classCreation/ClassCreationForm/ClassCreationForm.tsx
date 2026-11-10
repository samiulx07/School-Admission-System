"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { BsArrowRight, BsCheck2Circle, BsPlusLg } from "react-icons/bs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classCreationSchema, type ClassCreationFields, type CreateClassRequest } from "../classCreationSchema";
import { getClassCreationError } from "../getClassCreationError";
import { useCreateClass } from "../useCreateClass";
import styles from "./ClassCreationForm.module.scss";

export function ClassCreationForm() {
  const mutation = useCreateClass();
  const successRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClassCreationFields, unknown, CreateClassRequest>({
    resolver: zodResolver(classCreationSchema),
    defaultValues: { name: "", totalSeats: "" },
  });
  const createdClass = mutation.data;
  const pending = mutation.isPending || isSubmitting;
  const problem = mutation.isError ? getClassCreationError(mutation.error) : null;

  useEffect(() => {
    if (createdClass) successRef.current?.focus();
  }, [createdClass]);

  async function submit(values: CreateClassRequest) {
    try {
      await mutation.mutateAsync(values);
      reset();
    } catch {
      // The mutation state presents the service problem without discarding the form.
    }
  }

  if (createdClass) {
    return (
      <div className={styles.success} ref={successRef} tabIndex={-1} role="status" aria-labelledby="class-created-heading">
        <BsCheck2Circle className={styles.successIcon} aria-hidden="true" />
        <h2 id="class-created-heading">Class created</h2>
        <p><strong>{createdClass.name}</strong> is now in the class catalogue.</p>
        <p className={styles.capacity}>Capacity: <strong>{createdClass.totalSeats.toLocaleString("en-US")}</strong> {createdClass.totalSeats === 1 ? "place" : "places"}</p>
        <Link href="/classes" className="btn btn-primary">View classes <BsArrowRight aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <Form className={styles.form} noValidate onSubmit={handleSubmit(submit)} aria-busy={pending} aria-labelledby="class-details-heading">
      <div className={styles.heading}>
        <h2 id="class-details-heading">Class details</h2>
        <p>Both fields are required.</p>
      </div>
      {problem ? (
        <Alert variant="danger" className={styles.problem} role="alert">
          <h3>{problem.heading}</h3>
          <p>{problem.message}</p>
        </Alert>
      ) : null}
      <fieldset disabled={pending} className={styles.fields}>
        <legend className="visually-hidden">New class details</legend>
        <Form.Group className={styles.field} controlId="class-name">
          <Form.Label>Class name</Form.Label>
          <Form.Control
            {...register("name")}
            autoComplete="off"
            maxLength={200}
            placeholder="For example, Class 6 Morning"
            isInvalid={Boolean(errors.name)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={`class-name-help${errors.name ? " class-name-error" : ""}`}
          />
          <Form.Text id="class-name-help">Use a name students can recognise. Maximum 200 characters.</Form.Text>
          {errors.name ? <Form.Control.Feedback type="invalid" id="class-name-error" role="alert">{errors.name.message}</Form.Control.Feedback> : null}
        </Form.Group>
        <Form.Group className={styles.field} controlId="class-total-seats">
          <Form.Label>Total seats</Form.Label>
          <Form.Control
            {...register("totalSeats")}
            type="number"
            inputMode="numeric"
            min={1}
            max={2_147_483_647}
            step={1}
            placeholder="For example, 30"
            isInvalid={Boolean(errors.totalSeats)}
            aria-invalid={Boolean(errors.totalSeats)}
            aria-describedby={`class-total-seats-help${errors.totalSeats ? " class-total-seats-error" : ""}`}
          />
          <Form.Text id="class-total-seats-help">The class capacity. Enter a whole number of 1 or more.</Form.Text>
          {errors.totalSeats ? <Form.Control.Feedback type="invalid" id="class-total-seats-error" role="alert">{errors.totalSeats.message}</Form.Control.Feedback> : null}
        </Form.Group>
        <Button type="submit" disabled={pending} className={styles.submit}>
          {pending ? <Spinner as="span" animation="border" size="sm" aria-hidden="true" /> : <BsPlusLg aria-hidden="true" />}
          {pending ? "Creating class..." : "Create class"}
        </Button>
      </fieldset>
      <p className={styles.note}>The new class will appear in the catalogue as soon as it is created.</p>
    </Form>
  );
}
