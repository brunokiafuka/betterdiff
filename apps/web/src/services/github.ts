// GitHub service that calls Convex functions
import {  useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";



export const useValidateToken = () => {
  return useAction(api.auth.validateToken);
};

export const useDeleteAccount = () => {
  return useMutation(api.auth.deleteAccount);
};


export const useFetchRepos = () => {
  return useAction(api.github.fetchRepos);
};

export const useGetRepo = () => {
  return useAction(api.github.getRepo);
};

export const useListBranches = () => {
  return useAction(api.github.listBranches);
};

export const useGetRepoTree = () => {
  return useAction(api.github.getRepoTree);
};

export const useGetFileContent = () => {
  return useAction(api.github.getFileContent);
};

export const useCompareRefs = () => {
  return useAction(api.github.compareRefs);
};

export const useGetFileHistory = () => {
  return useAction(api.github.getFileHistory);
};

export const useGetCommit = () => {
  return useAction(api.github.getCommit);
};

export const useGetBlame = () => {
  return useAction(api.github.getBlame);
};


