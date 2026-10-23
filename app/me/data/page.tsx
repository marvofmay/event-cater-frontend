"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useRouter } from "next/navigation";

import { MainData } from "@/app/components/userProfile/MainData/MainData";
import AvatarForm from "@/app/components/userProfile/Avatar";
import AddressData from "@/app/components/userProfile/AddressData/AddressData";
import AdditionalData from "@/app/components/userProfile/ContactData/ContactlData";
import useUserProfileDataQuery from "@/app/hooks/userProfile/useUserProfileDataQuery";
import EmploymentData from "@/app/components/userProfile/EmploymentData";

const queryClient = new QueryClient();

const DataContent: React.FC = () => {
  const { isAuthenticated, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/me/logout");
    }
  }, [loading, isAuthenticated, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <InnerDataContent />
    </QueryClientProvider>
  );
};

const InnerDataContent: React.FC = () => {
  const { isAuthenticated, loading } = useUser();
  const { t } = useTranslation();

  const {
    data: userProfileData,
    isLoading,
    isError,
    error,
  } = useUserProfileDataQuery(!loading && isAuthenticated);

  if (loading || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="300px"
      >
        <Typography color="error">{(error as Error).message}</Typography>
      </Box>
    );
  }

  const userData = userProfileData?.data;
  const isTechnicalAccount = !userData?.employee;

  return (
    <Box className="grid grid-rows-[10px_1fr_10px] min-h-screen p-1 sm:p-1 font-[family-name:var(--font-geist-sans)]">
      <main>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Box width="90%">
            <Typography variant="h6" gutterBottom>
              {" "}
              {t("userProfile.data.title")}
            </Typography>
            <Box className="grid grid-rows-[5px_1fr_5px] justify-items-center min-h-screen p-1 sm:p-1">
              <main className="flex flex-col gap-6 row-start-2 items-center w-full h-full">
                <Box className="w-full p-4 sm:p-6 bg-white shadow-md rounded-lg">
                  {isTechnicalAccount ? (
                    <Box className="p-4 bg-gray-100 rounded-md shadow text-center">
                      <Typography variant="body1">
                        {t("userProfile.technicalAccountMessage", {
                          email: userData?.email,
                        })}
                      </Typography>
                    </Box>
                  ) : (
                    <Box className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      <Box className="p-4 bg-gray-100 rounded-md shadow">
                        <Typography variant="h6" className="mb-2 text-center">
                          {t("userProfile.data.main")}
                        </Typography>
                        <MainData data={userData} />
                      </Box>
                      <Box className="p-4 bg-gray-100 rounded-md shadow">
                        <Typography variant="h6" className="mb-2 text-center">
                          {t("userProfile.data.employment")}
                        </Typography>
                        <EmploymentData data={userData?.employee?.employment} />
                      </Box>
                      <Box className="p-4 bg-gray-100 rounded-md shadow">
                        <Typography variant="h6" className="mb-2 text-center">
                          {t("userProfile.data.avatar")}
                        </Typography>
                        <AvatarForm data={userData?.employee?.avatar} />
                      </Box>

                      <Box className="p-4 bg-gray-100 rounded-md shadow">
                        <Typography variant="h6" className="mb-2 text-center">
                          {t("userProfile.data.address")}
                        </Typography>
                        <AddressData data={userData?.employee?.address} />
                      </Box>

                      <Box className="p-4 bg-gray-100 rounded-md shadow">
                        <Typography variant="h6" className="mb-2 text-center">
                          {t("userProfile.data.contact")}
                        </Typography>
                        <AdditionalData data={userData?.employee?.contacts} />
                      </Box>
                    </Box>
                  )}
                </Box>
              </main>
            </Box>
          </Box>
        </Box>
      </main>
    </Box>
  );
};

export default DataContent;
