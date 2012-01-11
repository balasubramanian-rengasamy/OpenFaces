/*
 * OpenFaces - JSF Component Library 2.0
 * Copyright (C) 2007-2011, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */

package org.openfaces.util;

import javax.faces.FacesException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;

public class FileUploadFilter implements Filter {
    public static final String INIT_PARAM_MAX_FILE_SIZE = "org.openfaces.fileUpload.fileSizeLimit";
    private static final String INIT_PARAM_TEMP_DIR = "org.openfaces.fileUpload.tempDir";

    private ServletContext servletContext;
    
    private String getTempDir() {
        String tempDirAttr = FileUploadFilter.class.getName() + "." + INIT_PARAM_TEMP_DIR;
        String tempDir = (String) servletContext.getAttribute(tempDirAttr);
        if (tempDir == null) {
            tempDir = servletContext.getInitParameter("org.openfaces.fileUpload.tempDir");
            if (tempDir == null) {
                tempDir = getStandardTempDir();
            }

            File tempDirFile = new File(tempDir);
            if (!tempDirFile.exists()) {
                if (!tempDirFile.mkdirs()) {
                    String tempDirFileCanonicalPath;
                    try {
                        tempDirFileCanonicalPath = tempDirFile.getCanonicalPath();
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                    throw createFilterRuntimeException("Cannot create temporary directory at the specified location: " +
                            tempDirFileCanonicalPath, null);
                }
            } else {
                if (tempDirFile.isFile()) {
                    String tempDirFileCanonicalPath;
                    try {
                        tempDirFileCanonicalPath = tempDirFile.getCanonicalPath();
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }

                    throw createFilterRuntimeException("Cannot create temporary directory at the specified location, because a" +
                            "file with the same name already exists: " + tempDirFileCanonicalPath, null);
                }
            }


            servletContext.setAttribute(tempDirAttr, tempDir);
        }
        return tempDir;
    }

    private String getStandardTempDir() {
        String tempDir;
        File tempFile = null;
        try {
            tempFile = File.createTempFile("_openfaces_upload_temp", "tmp");

            File standardTempDir = tempFile.getParentFile();
            try {
                tempDir = standardTempDir.getCanonicalPath();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        } catch (IOException e) {
            String tempDirProperty = System.getProperty("java.io.tmpdir");
            String error = "OpenFaces FileUpload error: cannot create temporary file with " +
                    "File.createTempFile() method. System property java.io.tmpdir=" + tempDirProperty +
                    "; Consider specifying the " + INIT_PARAM_TEMP_DIR +
                    " context param in application's web.xml to specify temporary upload directory explicitly";
            throw createFilterRuntimeException(error, e);
        } finally {
            if (tempFile != null) tempFile.delete();
        }
        return tempDir;
    }

    private RuntimeException createFilterRuntimeException(String message, IOException e) {
        System.err.println(message);
        if (e != null)
            return new RuntimeException(message, e);
        else
            return new RuntimeException(message);
    }

    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest hRequest = (HttpServletRequest) request;

        //Check whether we're dealing with a multipart request
        boolean isMultipart = (hRequest.getHeader("content-type") != null &&
                hRequest.getHeader("content-type").contains("multipart/form-data"));

        if (!isMultipart) {
            chain.doFilter(request, response);
        } else {
            //We're dealing with a multipart request - we have to wrap the request.
            String tempDirStr = getTempDir();

            String maxSizeString = servletContext.getInitParameter(INIT_PARAM_MAX_FILE_SIZE);
            long maxSizeOfFile = (maxSizeString != null) ? Long.parseLong(maxSizeString) * 1024 : Long.MAX_VALUE;

            FileUploadRequestWrapper wrapper = new FileUploadRequestWrapper(hRequest, tempDirStr, maxSizeOfFile);
            request.setAttribute("fileUploadRequest", true);
            chain.doFilter(wrapper, response);
        }
    }

    public void destroy() {
    }

    public void init(FilterConfig config) throws ServletException {
        servletContext = config.getServletContext();
    }


}