export const site = {
  name: "Seatwise",
  description: "Choose a class, hold an available place, and confirm your school admission before the deadline.",
  admissionSteps: [
    { title: "Choose an available class", description: "Check the open, held and confirmed places for each class. Availability helps you see where there is room to apply." },
    { title: "Hold your place", description: "Use your 17-digit registration number to reserve an available place. Each hold has a deadline, shown with your application." },
    { title: "Confirm your decision", description: "Confirm before the deadline to secure admission. You can cancel a pending hold if your plans change." },
  ],
} as const;
