export function getCurrentUser() {

  return {

    userId: Number(localStorage.getItem("user_id")),

    role: localStorage.getItem("role"),

    companyId: Number(localStorage.getItem("company_id")),

    departmentId: Number(localStorage.getItem("department_id")),

    name: localStorage.getItem("user_name"),

    email: localStorage.getItem("email"),

  };

}