var documenterSearchIndex = {"docs":
[{"location":"#MPMEstimate.jl","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"","category":"section"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"(Image: ) (Image: )","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"(Image: )","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"The Maximum Posterior Mass (MPM) estimate is a general tool for hierarchical Bayesian inference. It provides an (often extremely good) approximation to the posterior distribution, and is faster than other methods such as Hamiltonian Monte Carlo (HMC), Variational Inference (VI), Likelihood-Free Inference (LFI). It excels on problems which are high-dimensional and mildly-to-moderately non-Gaussian. ","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"MPM works on standard hierarchical problems, where the likelihood is of the form:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"mathcalP(xtheta) = int rm dz  mathcalP(xztheta)  mathcalP(ztheta)","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"In our notation, x are the observed variables (the \"data\"), z are unobserved \"latent\" variables, and theta are some \"hyperparameters\" of interest. MPM is applicable when the goal of the analysis is to estimate the hyperparameters, theta, but otherwise, the latent variables, z, do not need to be inferred (only marginalized out via the integral above).","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"HMC performs the above integral via Monte Carlo, VI perfoms it by parameterizing the integrand with a function that has a known solution, and LFI performs it by importance sampling. MPM differs in that performs it with a semi-analytic approximation which implicilty accounts for some of the non-Gaussianity of the integrand, and which is fast to compute. The output of the MPM procedure is an estimate of the hyperparameters, hat theta, which can be proven to be asymptotically unbiased, and its covariance, Sigma_theta. In the asymptotic limit (i.e. a large enough data vector), and assuming uniform priors on theta, this estimator and its covariance will be the same as the posterior mean and the posterior covariance of theta. Even for finite data, the MPM estimate can be considered an approximation to the Bayesian posterior, and is often sufficiently close to yield an acceptable answer for a fraction of the computational cost of the exact solution. For more details see Millea & Seljak, 2021.","category":"page"},{"location":"#Install","page":"MPMEstimate.jl","title":"Install","text":"","category":"section"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"MPMEstimate.jl is a Julia package for computing the MPM estimate. To install it, run the following from the Julia package prompt:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"pkg> add https://github.com/marius311/MPMEstimate.jl","category":"page"},{"location":"#Usage-(with-Turing.jl)","page":"MPMEstimate.jl","title":"Usage (with Turing.jl)","text":"","category":"section"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"The easiest way to use MPMEstimate is with problems defined via the Probabilistic Programming Language, Turing.jl.","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"First, load up the relevant packages:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"using MPMEstimate, DynamicHMC, Random, Turing, PyPlot\nPyPlot.ioff() # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"As an example, consider the following hierarchical problem, which has the classic Neal's Funnel problem embedded in it. Neal's funnel is a standard example of a non-Gaussian latent space which HMC struggles to sample efficiently without extra tricks. Specifically, we consider the model defined by:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"theta sim rm Uniform(-1010)  \nz_i sim rm Normal(0exp(theta2))  \nx_i sim rm Normal(z_i 1)","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"where i=150. This problem can be described by the following Turing model:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"@model function funnel(x=missing; θ=missing)\n    θ ~ Uniform(-10, 10)\n    z ~ MvNormal(zeros(50), exp(θ/2))\n    x ~ MvNormal(z, 1)\nend\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Note that, because the MPM algorithm needs to be able to sample from mathcalP(xtheta), θ must appear as an explicit argument to the model function, and it should have the default value of missing, as above.","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Next, lets choose a true value of theta=1 and generate some simulated data:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Random.seed!(0)\nx = funnel(θ=1)() # draw sample of `x` to use as simulated data\nmodel = funnel(x)\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"We can run HMC on the problem to compute an \"exact\" answer to compare against:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Turing.PROGRESS[] = false # hide\nsample(model, DynamicNUTS(), 10); # warmup # hide\nchain = @time sample(model, DynamicNUTS(), 5000)\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"And we can compute the MPM estimate for the same problem:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"mpm(model, 1) # warmup # hide\nRandom.seed!(5) # hide\nθ̂, σθ = @time mpm(model, 1)\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"For a more careful comparison of the two approaches in terms of the number of model gradient evaluations, see Millea & Seljak, 2021, but the timing difference above is indicative of the type of speedups which are possible, and the relative speedup generally increases for higher-dimensional latent spaces. ","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Finally, we can compare the two estimates, veryfing that in this case, MPM gives a near exact answer:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"figure(figsize=(6,5)) # hide\naxvline(1, c=\"k\", ls=\"--\", alpha=0.5)\nhist(collect(chain[\"θ\"][:]), density=true, bins=20, label=\"HMC\")\nθs = range(-1,3,length=1000)\nplot(θs, pdf.(Normal(θ̂, σθ), θs), label=\"MPM\")\nlegend()\nxlabel(L\"\\theta\")\nylabel(L\"\\mathcal{P}(\\theta\\,|\\,x)\")\ngcf() # hide","category":"page"},{"location":"#Advanced","page":"MPMEstimate.jl","title":"Advanced","text":"","category":"section"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"note: Note\nCurrently names x and θ are hardcoded, and there can only be one of them (although they can be vectors). Need to make is to that there can be multiple latent and hyperparameters, and then describe that here. ","category":"page"},{"location":"#Usage-(manual)","page":"MPMEstimate.jl","title":"Usage (manual)","text":"","category":"section"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"It is also possible to use MPMEstimate without Turing. The MPM estimate requires two things:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"A function which samples from mathcalP(xztheta), with signature:\nfunction sample_x_z(rng::AbstractRNG, θ)\n    # ...\n    return (;x, z)\nend\nwhere rng is an AbstractRNG object which should be used when generating random numbers, θ are the parameters, and return value should be a named tuple (;x, z). \nA function which computes the likelihood, mathcalP(xthetaz), with signature:\nfunction logP(x, θ, z) \n    # return log probability\nend\nA user-specifiable automatic differentiation library will be used to take gradients of this function. ","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"In both (1) and (2), x, θ, and z can be of any type which supports basic arithmetic, including scalars, Vectors, special vector types like ComponentArrays, etc...","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"We can compute the MPM estimate for the same funnel problem as above. To do so, first we create an MPMProblem object which specifies the two functions:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"prob = MPMProblem(\n    function sample_x_z(rng, θ)\n        z = rand(rng, MvNormal(zeros(50), exp(θ/2)))\n        x = rand(rng, MvNormal(z, 1))\n        (;x, z)\n    end,\n    function logP(x, θ, z)\n        -(1//2) * (sum(z.^2) / exp(θ) + sum((x .- z).^2))\n    end\n)\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"And compute the estimate:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Random.seed!(5) # hide\nmpm(prob, x, 1) # warmup # hide\nθ̂′, σθ′ = @time mpm(prob, x, 1)\nnothing # hide","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"Finally, we can verify that the answer is identical to the answer computed when the problem was specified with Turing:","category":"page"},{"location":"","page":"MPMEstimate.jl","title":"MPMEstimate.jl","text":"figure(figsize=(6,5)) # hide\nhist(collect(chain[\"θ\"][:]), density=true, bins=20, label=\"HMC\")\nθs = range(-1,3,length=1000)\nplot(θs, pdf.(Normal(θ̂, σθ), θs), label=\"MPM\")\nplot(θs, pdf.(Normal(θ̂′, σθ′), θs), label=\"MPM\", ls=\"--\")\nlegend()\nxlabel(L\"\\theta\")\nylabel(L\"\\mathcal{P}(\\theta\\,|\\,x)\")\ngcf() # hide","category":"page"}]
}
