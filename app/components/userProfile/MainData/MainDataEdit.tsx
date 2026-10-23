import { UserProfileDataResponse } from "@/app/types/UserProfileDataResponse";
import React from "react";
import { useTranslation } from "react-i18next";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from 'react-toastify';
import useUpdateEmployeePersonalDataMutation from "@/app/hooks/userProfile/useUpdateEmployeePersonalDataMutation";
import { useQueryClient } from "@tanstack/react-query";

type Employee = NonNullable<
    NonNullable<UserProfileDataResponse['data']>['employee']
>;

interface FormValues {
    firstName: string;
    lastName: string;
}

const validationSchema = Yup.object({
    firstName: Yup.string().required('Imię jest wymagane'),
    lastName: Yup.string().required('Nazwisko jest wymagane'),
});

const MainDataEdit: React.FC<{
    employee: Employee;
    onCancel: () => void;
    onSaved: () => void;
}> = ({ employee, onCancel, onSaved }) => {
    const { t } = useTranslation();

    const initialValues: FormValues = {
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
    };

    const queryClient = useQueryClient();

    const useUpdateEmployeePersonalData = useUpdateEmployeePersonalDataMutation();

    const handleSubmit = async (values: FormValues): Promise<void> => {
        return new Promise((resolve, reject) => {
            useUpdateEmployeePersonalData.mutate(
                {
                    firstName: values.firstName,
                    lastName: values.lastName,
                },
                {
                    onSuccess: async (message: string) => {
                        toast.success(message);

                        await queryClient.invalidateQueries({
                            queryKey: ['user_profile_data'],
                        });

                        onSaved();
                        resolve();
                    },
                    onError: (error) => {
                        toast.error(t('user.data.personal.update.error'));
                        reject(error);
                    },
                }
            );
        });
    };

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting, isValid }) => (
                    <Form>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                            <div>
                                <Field
                                    name="firstName"
                                    type="text"
                                    className="px-3 py-2 border rounded-md text-sm w-full"
                                    placeholder={t('employee.form.field.firstName')}
                                />
                                <ErrorMessage
                                    name="firstName"
                                    component="p"
                                    className="text-xs text-red-600 mt-1"
                                />
                            </div>

                            <div>
                                <Field
                                    name="lastName"
                                    type="text"
                                    className="px-3 py-2 border rounded-md text-sm w-full"
                                    placeholder={t('employee.form.field.lastName')}
                                />
                                <ErrorMessage
                                    name="lastName"
                                    component="p"
                                    className="text-xs text-red-600 mt-1"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 rounded-md text-sm font-bold bg-gray-400 text-white hover:bg-gray-500 transition"
                            >
                                {t('common.button.cancel')}
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting || !isValid}
                                className="
                                    px-4 py-2 rounded-md text-sm font-bold
                                    bg-slate-700 text-white
                                    hover:bg-slate-800
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition
                                "
                            >
                                {t('common.button.save')}
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default MainDataEdit;
